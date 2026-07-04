-- ============================================================
-- 053: 公演のチケット情報・座席情報カラムを撤去する（#262）
-- ------------------------------------------------------------
-- 目的:
--   ライブ詳細・ライブ管理フォームからチケット情報・座席情報を撤去する
--   （#262）。当日情報カードの情報過多を解消し、座席メモは参戦記録の
--   座席メモ・メモ（#246）で代替する。既存データはほぼ未登録で残す価値が
--   無いことがユーザー確認済みのため（#262 Decision, 2026-07-04）、列ごと
--   DROP する。
--
-- 変更内容:
--   (1) upsert_orbit_live の再定義（052 の定義をベースに、公演の INSERT/UPDATE
--       から ticket_info / seat_info を除去する。他は一切変更しない）。
--       plpgsql 関数本体はカラム DROP 時に検査されないが、新アプリ（ticket_info /
--       seat_info を送らない LiveForm）と挙動を一致させ、旧アプリからの payload に
--       これらのキーが含まれても無視する（読まなくなるため）。
--   (2) orbit_live_performances から ticket_info / seat_info 列を DROP する。
--
-- 適用順序:
--   関数を先に再定義（列を参照しない版）してから DROP COLUMN する。
--   （plpgsql は本体を実行時までパースしないため厳密な順序依存は無いが、
--   参照が残らない状態を明示するためこの順にする。）
--
-- 互換性:
--   本 migration 適用後、旧アプリ（ticket_info / seat_info 入りの payload を送る
--   LiveForm）が upsert_orbit_live を呼んでも、関数がこれらを読まないため無視される
--   （エラーにはならない）。新アプリはそもそも送らない。
--
-- ロールバック方針:
--   1. ALTER TABLE public.orbit_live_performances
--        ADD COLUMN ticket_info TEXT,
--        ADD COLUMN seat_info TEXT;
--      （元は NULL 許容・デフォルト無し。既存データは復元されない。）
--   2. upsert_orbit_live を 052_split_setlist_replace_rpc.sql の
--      CREATE OR REPLACE FUNCTION 定義（ticket_info / seat_info を含む版）で
--      再適用する。
-- ============================================================

-- ============================================================
-- (1) upsert_orbit_live の再定義（052 ベース。ticket_info / seat_info の除去のみ）
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
          sort_order = v_sort
      WHERE id = v_performance_id
        AND live_id = v_live_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'orbit_live_performance not found: %', v_performance_id;
      END IF;

      -- 子データ（ユーザーデータを持たない）は作り直す。
      -- セトリ（orbit_setlist_items とその子）は本 RPC の対象外（052）。
      -- public.replace_performance_setlist が専属管理するため、ここでは触らない。
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

-- ============================================================
-- (2) 列の DROP
-- ============================================================
ALTER TABLE public.orbit_live_performances
  DROP COLUMN ticket_info,
  DROP COLUMN seat_info;
