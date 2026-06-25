-- ============================================================
-- 031: ライブ＋公演の作成/更新を RPC でトランザクション化（#100）
-- 親 orbit_lives と子（出演グループ/出演メンバー/公演/休演）を 1 トランザクションで
-- 置き換える。p_id が NULL のとき作成、それ以外は更新。
-- ============================================================

DROP FUNCTION IF EXISTS public.upsert_orbit_live(UUID, JSONB);

CREATE FUNCTION public.upsert_orbit_live(
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
  v_sort           INT := 0;
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
      session_label,
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
      NULLIF(v_performance->>'session_label', ''),
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

    v_sort := v_sort + 1;
  END LOOP;

  RETURN v_live_id;
END;
$$;
