-- 月で誕生日メンバーの ID を取得
CREATE OR REPLACE FUNCTION find_birthday_member_ids_by_month(target_month INT)
RETURNS SETOF UUID AS $$
  SELECT id FROM public.orbit_members
  WHERE date_of_birth IS NOT NULL
    AND EXTRACT(MONTH FROM date_of_birth) = target_month
  ORDER BY EXTRACT(DAY FROM date_of_birth);
$$ LANGUAGE sql STABLE SET search_path = '';

-- 月日で誕生日メンバーの ID を取得
CREATE OR REPLACE FUNCTION find_birthday_member_ids_by_date(target_month INT, target_day INT)
RETURNS SETOF UUID AS $$
  SELECT id FROM public.orbit_members
  WHERE date_of_birth IS NOT NULL
    AND EXTRACT(MONTH FROM date_of_birth) = target_month
    AND EXTRACT(DAY FROM date_of_birth) = target_day
  ORDER BY name_kana;
$$ LANGUAGE sql STABLE SET search_path = '';

-- 月日で過去イベントの ID を取得
CREATE OR REPLACE FUNCTION find_event_ids_on_this_day(target_month INT, target_day INT)
RETURNS SETOF UUID AS $$
  SELECT id FROM public.orbit_events
  WHERE EXTRACT(MONTH FROM date) = target_month
    AND EXTRACT(DAY FROM date) = target_day
  ORDER BY date;
$$ LANGUAGE sql STABLE SET search_path = '';
