-- ============================================================
-- 052: セトリ保存を専用 RPC に分離する（#261）
-- ------------------------------------------------------------
-- 目的:
--   セットリストの編集を専用画面（公演単位）に移し、既存 LiveForm から
--   セトリ編集を撤去する（#261）。現行 upsert_orbit_live は
--   「payload からセトリ再構築」（050 で実装）のため、LiveForm がセトリを
--   送らなくなるとライブ編集のたびに既存セトリが削除されたまま復元されない
--   （消失する）。これを防ぐため:
--     (1) セトリ保存を新 RPC replace_performance_setlist（公演単位の
--         置き換え）に分離する
--     (2) upsert_orbit_live からセトリ構築（DELETE + 再 INSERT）を除去し、
--         セトリは新 RPC の専属管理にする
--
-- 変更内容:
--   (1) 新規 RPC public.replace_performance_setlist(p_performance_id, p_payload)
--       - 対象公演の存在確認 → 既存セトリの全削除 → payload からの再構築、
--         を1トランザクションで行う（複数テーブル一括更新は RPC にまとめる規約）
--       - setlist_items の構築ロジック（position 採番 / performance_style
--         互換 / members / formation_rows）は 050 の upsert_orbit_live から
--         そのまま移植する（新旧互換の CASE 分岐を含め同一仕様）
--       - SECURITY INVOKER + search_path 固定。呼び出しは admin の認証付き
--         クライアント想定で、RLS（is_orbit_admin）がそのまま効く
--   (2) upsert_orbit_live の再定義（050 ベース）
--       - setlist_items 関連の DELETE・INSERT ループ一式（items /
--         item_members / formation ループ）と関連 DECLARE 変数を除去する
--       - absences・performer 再構築・公演の UPDATE/INSERT/差分 DELETE
--         （048 の参加記録保護）は一切変更しない
--       - 本 migration 適用後〜新アプリ（セトリ非送信の LiveForm）デプロイ
--         までの窓では、旧 LiveForm がセトリ入りの payload を送っても
--         無視される（upsert_orbit_live がセトリを削除しなくなるため、
--         既存セトリはそのまま保持される）
--
-- payload 契約（replace_performance_setlist）:
--   p_payload = {
--     "items": [
--       {
--         "item_type": "song" | "mc" | "shadow_announcement" | "vtr" |
--                       "dance_track" | "overture" | "other",
--         "track_id": uuid string | null,
--         "song_title": string | null,
--         "note": string | null,
--         "section": "main" | "encore" | "double_encore" | "triple_encore",
--         "performance_styles": string[]   -- 新形式（優先）。
--         "performance_style": string      -- 旧形式（performance_styles が
--                                             無い場合のみ1要素配列として解釈）
--         "costume_note": string | null,
--         "members": [ { "member_id": uuid string, "is_center": boolean } ],
--         "formation_rows": [
--           { "row_number": int, "member_ids": [uuid string, ...] }
--         ]
--       },
--       ...
--     ]
--   }
--   items は配列順で position 0 起点で採番する。members の sort_order・
--   formation_rows の slot_order も配列順で0起点。
--
-- ロールバック方針:
--   1. upsert_orbit_live を 050_extend_setlist_items.sql の
--      CREATE OR REPLACE FUNCTION 定義（セトリ再構築込み）で再適用する。
--   2. DROP FUNCTION IF EXISTS public.replace_performance_setlist(UUID, JSONB);
-- ============================================================

-- ============================================================
-- (1) 新規 RPC: 公演単位のセトリ置き換え
-- ------------------------------------------------------------
-- 050 の upsert_orbit_live における setlist_items 構築ループ
-- （position 採番 / performance_style 互換 / members / formation_rows）を
-- そのまま移植する。
-- ============================================================
CREATE FUNCTION public.replace_performance_setlist(
  p_performance_id UUID,
  p_payload JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_item                JSONB;
  v_item_id             UUID;
  v_item_member         JSONB;
  v_formation_row       JSONB;
  v_formation_row_id    UUID;
  v_formation_member_id TEXT;
  v_position            INT := 0;
  v_member_sort         INT;
  v_slot_order          INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orbit_live_performances WHERE id = p_performance_id
  ) THEN
    RAISE EXCEPTION 'orbit_live_performance not found: %', p_performance_id;
  END IF;

  -- 子データ（orbit_setlist_item_members / orbit_setlist_item_formation_rows(_members)）は
  -- orbit_setlist_items の削除で ON DELETE CASCADE により連動削除される。
  DELETE FROM public.orbit_setlist_items WHERE performance_id = p_performance_id;

  FOR v_item IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'items', '[]'::jsonb))
  LOOP
    INSERT INTO public.orbit_setlist_items (
      performance_id,
      position,
      item_type,
      track_id,
      song_title,
      note,
      performance_style,
      section,
      performance_styles,
      costume_note
    )
    VALUES (
      p_performance_id,
      v_position,
      v_item->>'item_type',
      NULLIF(v_item->>'track_id', '')::uuid,
      NULLIF(v_item->>'song_title', ''),
      NULLIF(v_item->>'note', ''),
      -- 互換: 旧 performance_style 列には新配列の先頭要素、無ければ
      -- 旧 payload の performance_style（単一値）を書く（050 と同一仕様）。
      COALESCE(
        NULLIF(v_item->'performance_styles'->>0, ''),
        NULLIF(v_item->>'performance_style', '')
      ),
      COALESCE(NULLIF(v_item->>'section', ''), 'main'),
      -- 新 performance_styles 列: 新 payload（配列）を優先し、
      -- 旧 payload（単一値）しか無ければ1要素配列に変換する（050 と同一仕様）。
      CASE
        WHEN v_item ? 'performance_styles' THEN ARRAY(
          SELECT jsonb_array_elements_text(COALESCE(v_item->'performance_styles', '[]'::jsonb))
        )
        WHEN NULLIF(v_item->>'performance_style', '') IS NOT NULL
          THEN ARRAY[NULLIF(v_item->>'performance_style', '')]
        ELSE ARRAY[]::text[]
      END,
      NULLIF(v_item->>'costume_note', '')
    )
    RETURNING id INTO v_item_id;

    v_member_sort := 0;
    FOR v_item_member IN
      SELECT * FROM jsonb_array_elements(COALESCE(v_item->'members', '[]'::jsonb))
    LOOP
      IF COALESCE(v_item_member->>'member_id', '') <> '' THEN
        INSERT INTO public.orbit_setlist_item_members (
          setlist_item_id,
          member_id,
          is_center,
          sort_order
        )
        VALUES (
          v_item_id,
          (v_item_member->>'member_id')::uuid,
          COALESCE((v_item_member->>'is_center')::boolean, false),
          v_member_sort
        );
        v_member_sort := v_member_sort + 1;
      END IF;
    END LOOP;

    FOR v_formation_row IN
      SELECT * FROM jsonb_array_elements(COALESCE(v_item->'formation_rows', '[]'::jsonb))
    LOOP
      INSERT INTO public.orbit_setlist_item_formation_rows (
        setlist_item_id,
        row_number,
        member_count
      )
      VALUES (
        v_item_id,
        (v_formation_row->>'row_number')::int,
        jsonb_array_length(COALESCE(v_formation_row->'member_ids', '[]'::jsonb))
      )
      RETURNING id INTO v_formation_row_id;

      v_slot_order := 0;
      FOR v_formation_member_id IN
        SELECT * FROM jsonb_array_elements_text(COALESCE(v_formation_row->'member_ids', '[]'::jsonb))
      LOOP
        IF v_formation_member_id <> '' THEN
          INSERT INTO public.orbit_setlist_item_formation_members (
            formation_row_id,
            member_id,
            slot_order
          )
          VALUES (
            v_formation_row_id,
            v_formation_member_id::uuid,
            v_slot_order
          );
          v_slot_order := v_slot_order + 1;
        END IF;
      END LOOP;
    END LOOP;

    v_position := v_position + 1;
  END LOOP;
END;
$$;

-- ============================================================
-- (2) upsert_orbit_live の再定義（セトリ構築の除去）
-- ------------------------------------------------------------
-- 050 の定義をベースに、setlist_items の DELETE・INSERT ループ一式
-- （items / item_members / formation ループ）と関連 DECLARE 変数を除去する。
-- セトリは public.replace_performance_setlist（本 migration (1)）が
-- 専属管理する。absences・performer 再構築・公演の UPDATE/INSERT/差分 DELETE
-- （048 の参加記録保護）は一切変更しない。
--
-- 本 migration 適用〜新アプリ（セトリ非送信の LiveForm）デプロイまでの
-- 窓では、旧 LiveForm がセトリ入りの payload（setlist_items キー）を
-- 送っても無視される（本関数がもうセトリを削除しないため、既存セトリは
-- そのまま保持される）。
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_orbit_live(
  p_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_live_id              UUID;
  v_performance          JSONB;
  v_performance_id       UUID;
  v_keep_performance_ids UUID[];
  v_absence              JSONB;
  v_sort                 INT := 0;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO public.orbit_lives (name, live_type, description)
    VALUES (
      p_payload->>'name',
      p_payload->>'live_type',
      NULLIF(p_payload->>'description', '')
    )
    RETURNING id INTO v_live_id;
  ELSE
    v_live_id := p_id;
    UPDATE public.orbit_lives
    SET name = p_payload->>'name',
        live_type = p_payload->>'live_type',
        description = NULLIF(p_payload->>'description', '')
    WHERE id = v_live_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'orbit_live not found: %', v_live_id;
    END IF;

    -- 公演: payload に id が含まれない既存公演のみ削除する（全削除はしない。公演IDを維持するため）。
    -- payload に id が1つも含まれない場合、keep 対象は空配列になり既存公演は全て削除される
    -- （従来の全DELETE挙動と結果は同じ）。
    SELECT COALESCE(array_agg(NULLIF(perf->>'id', '')::uuid), ARRAY[]::uuid[])
    INTO v_keep_performance_ids
    FROM jsonb_array_elements(COALESCE(p_payload->'performances', '[]'::jsonb)) AS perf
    WHERE NULLIF(perf->>'id', '') IS NOT NULL;

    -- 参加記録（orbit_live_attendances）が残っている公演をここで削除しようとすると
    -- FK RESTRICT違反で例外になる（意図した挙動）。
    DELETE FROM public.orbit_live_performances
    WHERE live_id = v_live_id
      AND NOT (id = ANY (v_keep_performance_ids));

    DELETE FROM public.orbit_live_performer_groups WHERE live_id = v_live_id;
    DELETE FROM public.orbit_live_performer_members WHERE live_id = v_live_id;
  END IF;

  INSERT INTO public.orbit_live_performer_groups (live_id, group_id)
  SELECT v_live_id, value::uuid
  FROM jsonb_array_elements_text(COALESCE(p_payload->'performer_group_ids', '[]'::jsonb));

  INSERT INTO public.orbit_live_performer_members (live_id, member_id)
  SELECT v_live_id, value::uuid
  FROM jsonb_array_elements_text(COALESCE(p_payload->'performer_member_ids', '[]'::jsonb));

  FOR v_performance IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'performances', '[]'::jsonb))
  LOOP
    v_performance_id := NULLIF(v_performance->>'id', '')::uuid;

    IF v_performance_id IS NULL THEN
      -- 新規公演
      INSERT INTO public.orbit_live_performances (
        live_id,
        venue_id,
        performance_date,
        doors_open_at,
        starts_at,
        has_streaming,
        has_live_viewing,
        ticket_info,
        seat_info,
        sort_order
      )
      VALUES (
        v_live_id,
        NULLIF(v_performance->>'venue_id', '')::uuid,
        NULLIF(v_performance->>'performance_date', '')::date,
        NULLIF(v_performance->>'doors_open_at', ''),
        NULLIF(v_performance->>'starts_at', ''),
        COALESCE((v_performance->>'has_streaming')::boolean, false),
        COALESCE((v_performance->>'has_live_viewing')::boolean, false),
        NULLIF(v_performance->>'ticket_info', ''),
        NULLIF(v_performance->>'seat_info', ''),
        v_sort
      )
      RETURNING id INTO v_performance_id;
    ELSE
      -- 既存公演の更新（公演IDを維持する）。live_id条件により、
      -- 他ライブの公演IDを流用した改ざんを防ぐ。
      UPDATE public.orbit_live_performances
      SET venue_id = NULLIF(v_performance->>'venue_id', '')::uuid,
          performance_date = NULLIF(v_performance->>'performance_date', '')::date,
          doors_open_at = NULLIF(v_performance->>'doors_open_at', ''),
          starts_at = NULLIF(v_performance->>'starts_at', ''),
          has_streaming = COALESCE((v_performance->>'has_streaming')::boolean, false),
          has_live_viewing = COALESCE((v_performance->>'has_live_viewing')::boolean, false),
          ticket_info = NULLIF(v_performance->>'ticket_info', ''),
          seat_info = NULLIF(v_performance->>'seat_info', ''),
          sort_order = v_sort
      WHERE id = v_performance_id
        AND live_id = v_live_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'orbit_live_performance not found: %', v_performance_id;
      END IF;

      -- 子データ（ユーザーデータを持たない）は作り直す。
      -- セトリ（orbit_setlist_items とその子）は本 RPC の対象外になった。
      -- public.replace_performance_setlist（052）が専属管理するため、
      -- ここでは削除・再構築しない（既存セトリを保持する）。
      DELETE FROM public.orbit_live_performance_absences WHERE performance_id = v_performance_id;
    END IF;

    FOR v_absence IN
      SELECT * FROM jsonb_array_elements(COALESCE(v_performance->'absences', '[]'::jsonb))
    LOOP
      IF COALESCE(v_absence->>'member_id', '') <> '' THEN
        INSERT INTO public.orbit_live_performance_absences (performance_id, member_id, note)
        VALUES (
          v_performance_id,
          (v_absence->>'member_id')::uuid,
          NULLIF(v_absence->>'note', '')
        );
      END IF;
    END LOOP;

    v_sort := v_sort + 1;
  END LOOP;

  RETURN v_live_id;
END;
$$;
