-- ============================================================
-- 034: ライブ入力UX(A)（#109）
-- - ライブ種別を単一軸へ統合：live_type を single/tour/festival/online/other に拡張
--   （旧 'live' は 'single' に移行。format は導入しない）
-- - orbit_live_performances.session_label（昼夜ラベル）を削除（開演時間で区別）
-- - upsert_orbit_live RPC を session_label 除去で再定義
-- ============================================================

-- 種別の統合（live -> single、CHECK を拡張）
UPDATE orbit_lives SET live_type = 'single' WHERE live_type = 'live';

ALTER TABLE orbit_lives DROP CONSTRAINT IF EXISTS orbit_lives_live_type_check;
ALTER TABLE orbit_lives
  ADD CONSTRAINT orbit_lives_live_type_check
  CHECK (live_type IN ('single', 'tour', 'festival', 'online', 'other'));

-- 昼夜ラベル削除
ALTER TABLE orbit_live_performances
  DROP COLUMN session_label;

CREATE OR REPLACE FUNCTION public.upsert_orbit_live(
  p_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_live_id        UUID;
  v_performance    JSONB;
  v_performance_id UUID;
  v_absence        JSONB;
  v_item           JSONB;
  v_item_id        UUID;
  v_item_member    JSONB;
  v_sort           INT := 0;
  v_position       INT;
  v_member_sort    INT;
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

    DELETE FROM public.orbit_live_performances WHERE live_id = v_live_id;
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
