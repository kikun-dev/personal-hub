-- Security fix: search_path を固定し、スキーマ汚染攻撃を防止
-- Supabase Security Advisory: "Function Search Path Mutable" 対応

ALTER FUNCTION public.find_birthday_member_ids_by_month(INT) SET search_path = '';
ALTER FUNCTION public.find_birthday_member_ids_by_date(INT, INT) SET search_path = '';
ALTER FUNCTION public.find_event_ids_on_this_day(INT, INT) SET search_path = '';
