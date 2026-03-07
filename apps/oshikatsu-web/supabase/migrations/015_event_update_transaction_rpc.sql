-- ============================================================
-- イベント更新をトランザクション境界内に集約する RPC
-- ============================================================
CREATE OR REPLACE FUNCTION update_event_with_relations(
  p_event_id UUID,
  p_event_type_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_date DATE,
  p_end_date DATE,
  p_start_time TIME,
  p_venue TEXT,
  p_url TEXT,
  p_group_ids UUID[],
  p_member_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.orbit_events
  SET
    event_type_id = p_event_type_id,
    title = p_title,
    description = COALESCE(p_description, ''),
    date = p_date,
    end_date = p_end_date,
    start_time = p_start_time,
    venue = p_venue,
    url = p_url
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found: %', p_event_id USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.orbit_event_groups
  WHERE event_id = p_event_id;

  INSERT INTO public.orbit_event_groups (event_id, group_id)
  SELECT
    p_event_id,
    group_id
  FROM (
    SELECT DISTINCT unnest(COALESCE(p_group_ids, ARRAY[]::UUID[])) AS group_id
  ) AS group_items;

  DELETE FROM public.orbit_event_members
  WHERE event_id = p_event_id;

  INSERT INTO public.orbit_event_members (event_id, member_id)
  SELECT
    p_event_id,
    member_id
  FROM (
    SELECT DISTINCT unnest(COALESCE(p_member_ids, ARRAY[]::UUID[])) AS member_id
  ) AS member_items;
END;
$$;
