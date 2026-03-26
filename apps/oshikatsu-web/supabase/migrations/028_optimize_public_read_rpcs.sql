-- ============================================================
-- 028: 公開閲覧導線向けの read RPC 最適化
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_orbit_birthdays_by_month(target_month INT)
RETURNS TABLE (
  id UUID,
  name_ja TEXT,
  date_of_birth DATE,
  group_names TEXT[]
) AS $$
  SELECT
    members.id,
    members.name_ja,
    members.date_of_birth,
    COALESCE(
      ARRAY(
        SELECT groups.name_ja
        FROM public.orbit_member_groups member_groups
        JOIN public.orbit_groups groups
          ON groups.id = member_groups.group_id
        WHERE member_groups.member_id = members.id
        ORDER BY groups.sort_order, member_groups.joined_at NULLS LAST, member_groups.id
      ),
      ARRAY[]::TEXT[]
    ) AS group_names
  FROM public.orbit_members members
  WHERE members.date_of_birth IS NOT NULL
    AND EXTRACT(MONTH FROM members.date_of_birth) = target_month
  ORDER BY EXTRACT(DAY FROM members.date_of_birth), members.name_kana, members.id;
$$ LANGUAGE sql STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.find_orbit_birthdays_by_date(target_month INT, target_day INT)
RETURNS TABLE (
  id UUID,
  name_ja TEXT,
  date_of_birth DATE,
  group_names TEXT[]
) AS $$
  SELECT
    members.id,
    members.name_ja,
    members.date_of_birth,
    COALESCE(
      ARRAY(
        SELECT groups.name_ja
        FROM public.orbit_member_groups member_groups
        JOIN public.orbit_groups groups
          ON groups.id = member_groups.group_id
        WHERE member_groups.member_id = members.id
        ORDER BY groups.sort_order, member_groups.joined_at NULLS LAST, member_groups.id
      ),
      ARRAY[]::TEXT[]
    ) AS group_names
  FROM public.orbit_members members
  WHERE members.date_of_birth IS NOT NULL
    AND EXTRACT(MONTH FROM members.date_of_birth) = target_month
    AND EXTRACT(DAY FROM members.date_of_birth) = target_day
  ORDER BY members.name_kana, members.id;
$$ LANGUAGE sql STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION public.find_orbit_events_on_this_day(target_month INT, target_day INT)
RETURNS TABLE (
  id UUID,
  event_type_id UUID,
  event_type_name TEXT,
  event_type_color TEXT,
  is_member_history BOOLEAN,
  title TEXT,
  date DATE,
  end_date DATE,
  start_time TIME,
  venue TEXT,
  group_ids UUID[],
  group_names TEXT[]
) AS $$
  SELECT
    events.id,
    events.event_type_id,
    event_types.name AS event_type_name,
    event_types.color AS event_type_color,
    events.is_member_history,
    events.title,
    events.date,
    events.end_date,
    events.start_time,
    events.venue,
    COALESCE(
      ARRAY(
        SELECT event_groups.group_id
        FROM public.orbit_event_groups event_groups
        LEFT JOIN public.orbit_groups groups
          ON groups.id = event_groups.group_id
        WHERE event_groups.event_id = events.id
        ORDER BY groups.sort_order, event_groups.group_id
      ),
      ARRAY[]::UUID[]
    ) AS group_ids,
    COALESCE(
      ARRAY(
        SELECT groups.name_ja
        FROM public.orbit_event_groups event_groups
        JOIN public.orbit_groups groups
          ON groups.id = event_groups.group_id
        WHERE event_groups.event_id = events.id
        ORDER BY groups.sort_order, groups.name_ja
      ),
      ARRAY[]::TEXT[]
    ) AS group_names
  FROM public.orbit_events events
  JOIN public.orbit_event_types event_types
    ON event_types.id = events.event_type_id
  WHERE EXTRACT(MONTH FROM events.date) = target_month
    AND EXTRACT(DAY FROM events.date) = target_day
  ORDER BY events.date, events.start_time NULLS LAST, events.created_at;
$$ LANGUAGE sql STABLE SET search_path = '';
