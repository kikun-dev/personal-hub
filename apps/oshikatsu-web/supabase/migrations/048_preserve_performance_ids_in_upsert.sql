-- ============================================================
-- 048: upsert_orbit_live で公演IDを維持する（#246）
-- ------------------------------------------------------------
-- 目的:
--   034（元は032で定義）の upsert_orbit_live はライブ更新のたびに
--   orbit_live_performances を全DELETE→再INSERTしており、公演IDが
--   編集のたびに変わっていた。047 で追加した orbit_live_attendances
--   （ユーザー別の参加記録）は performance_id を ON DELETE RESTRICT で
--   参照しているため、このままでは参加記録が1件でもある公演を含む
--   ライブを編集するたびに RESTRICT 違反で編集全体がブロックされてしまう
--   （Issue #246 レビュー指摘）。
--
--   payload の performances[] に id（既存公演はUUID文字列、新規公演は
--   null/未設定）を持たせ、公演単位で
--     - id あり → UPDATE（公演IDを維持）
--     - id なし → INSERT（新規公演）
--     - 既存公演のうち payload に id が含まれないもの → DELETE
--       （参加記録が残っている公演をここで消そうとすると FK RESTRICT
--       違反で例外になる。これは意図した挙動で、アプリ側で
--       「参加記録を解除してから編集してください」と案内する）
--   という方式に変更し、公演IDを可能な限り維持する。
--
-- 変更範囲:
--   p_id IS NOT NULL（更新時）の分岐のみ。p_id IS NULL（作成時）の
--   ライブ本体INSERT・グループ/メンバーの構築ロジックは不変。
--   公演ループの id 分岐（UPDATE/INSERT）自体は作成・更新で共通化した
--   が、作成時は新規ライブのため payload の performances[] に id が
--   来ない前提であり、その場合は常に INSERT 分岐のみが実行されるため
--   従来の挙動と結果は変わらない。
--
--   公演の子データ（absences / setlist_items / setlist_item_members）は
--   ユーザーデータを持たないため、更新対象の公演についても従来どおり
--   「その公演分をDELETE→payloadから再構築」を維持する
--   （setlist_item_members は orbit_setlist_items 削除時に
--   ON DELETE CASCADE で連動削除される）。
--   performer_groups / performer_members の DELETE→再INSERTも従来どおり。
--
-- ロールバック方針:
--   034_live_format_and_drop_session_label.sql の
--   CREATE OR REPLACE FUNCTION upsert_orbit_live 定義を再適用する。
--   本SQLはテーブル構造を変更しないため、関数定義の再適用のみで
--   ロールバックできる。
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
  v_item                 JSONB;
  v_item_id              UUID;
  v_item_member          JSONB;
  v_sort                 INT := 0;
  v_position              INT;
  v_member_sort            INT;
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
      -- orbit_setlist_item_members は orbit_setlist_items の削除で
      -- ON DELETE CASCADE により連動削除される。
      DELETE FROM public.orbit_live_performance_absences WHERE performance_id = v_performance_id;
      DELETE FROM public.orbit_setlist_items WHERE performance_id = v_performance_id;
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

    v_position := 0;
    FOR v_item IN
      SELECT * FROM jsonb_array_elements(COALESCE(v_performance->'setlist_items', '[]'::jsonb))
    LOOP
      INSERT INTO public.orbit_setlist_items (
        performance_id,
        position,
        item_type,
        track_id,
        song_title,
        note,
        performance_style
      )
      VALUES (
        v_performance_id,
        v_position,
        v_item->>'item_type',
        NULLIF(v_item->>'track_id', '')::uuid,
        NULLIF(v_item->>'song_title', ''),
        NULLIF(v_item->>'note', ''),
        NULLIF(v_item->>'performance_style', '')
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

      v_position := v_position + 1;
    END LOOP;

    v_sort := v_sort + 1;
  END LOOP;

  RETURN v_live_id;
END;
$$;
