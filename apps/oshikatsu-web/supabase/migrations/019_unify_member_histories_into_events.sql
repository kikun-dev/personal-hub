-- ============================================================
-- メンバー来歴を events に統合
-- ============================================================
ALTER TABLE public.orbit_events
  ADD COLUMN IF NOT EXISTS is_member_history BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_orbit_events_is_member_history_date
  ON public.orbit_events (is_member_history, date);

DO $$
DECLARE
  v_default_event_type_id UUID;
BEGIN
  IF to_regclass('public.orbit_member_histories') IS NULL THEN
    RETURN;
  END IF;

  SELECT id
    INTO v_default_event_type_id
  FROM public.orbit_event_types
  WHERE name = 'その他'
  LIMIT 1;

  IF v_default_event_type_id IS NULL THEN
    INSERT INTO public.orbit_event_types (name, color, sort_order)
    VALUES ('その他', '#6B7280', 999)
    ON CONFLICT (name) DO UPDATE
      SET color = EXCLUDED.color
    RETURNING id INTO v_default_event_type_id;
  END IF;

  INSERT INTO public.orbit_events (
    event_type_id,
    title,
    description,
    is_member_history,
    date,
    end_date,
    start_time,
    venue,
    url
  )
  SELECT
    v_default_event_type_id,
    history_keys.title,
    history_keys.description,
    TRUE,
    history_keys.date,
    NULL,
    NULL,
    NULL,
    NULL
  FROM (
    SELECT DISTINCT
      history.date,
      history.event AS title,
      COALESCE(history.note, '') AS description
    FROM public.orbit_member_histories AS history
  ) AS history_keys
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.orbit_events AS existing
    WHERE existing.is_member_history = TRUE
      AND existing.date = history_keys.date
      AND existing.title = history_keys.title
      AND existing.description = history_keys.description
      AND existing.url IS NULL
  );

  INSERT INTO public.orbit_event_members (event_id, member_id)
  SELECT DISTINCT
    mapped.event_id,
    history.member_id
  FROM public.orbit_member_histories AS history
  JOIN LATERAL (
    SELECT existing.id AS event_id
    FROM public.orbit_events AS existing
    WHERE existing.is_member_history = TRUE
      AND existing.date = history.date
      AND existing.title = history.event
      AND existing.description = COALESCE(history.note, '')
      AND existing.url IS NULL
    ORDER BY existing.created_at ASC, existing.id ASC
    LIMIT 1
  ) AS mapped ON TRUE
  ON CONFLICT (event_id, member_id) DO NOTHING;
END
$$;

DROP TABLE IF EXISTS public.orbit_member_histories;

-- ============================================================
-- メンバー更新RPC差し替え（histories 廃止）
-- ============================================================
DROP FUNCTION IF EXISTS public.update_member_with_relations(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  DATE,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  JSONB,
  JSONB
);

DROP FUNCTION IF EXISTS public.update_member_with_relations(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  DATE,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  JSONB,
  JSONB
);

CREATE FUNCTION public.update_member_with_relations(
  p_member_id UUID,
  p_name_ja TEXT,
  p_name_kana TEXT,
  p_name_en TEXT,
  p_date_of_birth DATE,
  p_zodiac TEXT,
  p_blood_type TEXT,
  p_call_name TEXT,
  p_penlight_color_1 TEXT,
  p_penlight_color_2 TEXT,
  p_height_cm NUMERIC(4,1),
  p_hometown TEXT,
  p_memo TEXT,
  p_image_url TEXT,
  p_blog_url TEXT,
  p_blog_hashtag TEXT,
  p_talk_app_name TEXT,
  p_talk_app_url TEXT,
  p_talk_app_hashtag TEXT,
  p_groups JSONB,
  p_sns JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.orbit_members
  SET
    name_ja = p_name_ja,
    name_kana = p_name_kana,
    name_en = p_name_en,
    date_of_birth = p_date_of_birth,
    zodiac = p_zodiac,
    blood_type = p_blood_type,
    call_name = p_call_name,
    penlight_color_1 = p_penlight_color_1,
    penlight_color_2 = p_penlight_color_2,
    height_cm = p_height_cm,
    hometown = p_hometown,
    memo = p_memo,
    image_url = p_image_url,
    blog_url = p_blog_url,
    blog_hashtag = p_blog_hashtag,
    talk_app_name = p_talk_app_name,
    talk_app_url = p_talk_app_url,
    talk_app_hashtag = p_talk_app_hashtag
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member not found: %', p_member_id USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.orbit_member_groups
  WHERE member_id = p_member_id;

  INSERT INTO public.orbit_member_groups (
    member_id,
    group_id,
    generation,
    joined_at,
    graduated_at
  )
  SELECT
    p_member_id,
    (group_item->>'group_id')::UUID,
    NULLIF(group_item->>'generation', ''),
    NULLIF(group_item->>'joined_at', '')::DATE,
    NULLIF(group_item->>'graduated_at', '')::DATE
  FROM jsonb_array_elements(COALESCE(p_groups, '[]'::JSONB)) AS group_item;

  DELETE FROM public.orbit_member_sns
  WHERE member_id = p_member_id;

  INSERT INTO public.orbit_member_sns (
    member_id,
    sns_type,
    display_name,
    url,
    hashtag,
    sort_order
  )
  SELECT
    p_member_id,
    sns_item->>'sns_type',
    sns_item->>'display_name',
    COALESCE(sns_item->>'url', ''),
    NULLIF(sns_item->>'hashtag', ''),
    COALESCE((sns_item->>'sort_order')::INT, 0)
  FROM jsonb_array_elements(COALESCE(p_sns, '[]'::JSONB)) AS sns_item;
END;
$$;

-- ============================================================
-- イベント更新RPC差し替え（is_member_history 追加）
-- ============================================================
DROP FUNCTION IF EXISTS public.update_event_with_relations(
  UUID,
  UUID,
  TEXT,
  TEXT,
  DATE,
  DATE,
  TIME,
  TEXT,
  TEXT,
  UUID[],
  UUID[]
);

DROP FUNCTION IF EXISTS public.update_event_with_relations(
  UUID,
  UUID,
  TEXT,
  TEXT,
  BOOLEAN,
  DATE,
  DATE,
  TIME,
  TEXT,
  TEXT,
  UUID[],
  UUID[]
);

CREATE FUNCTION public.update_event_with_relations(
  p_event_id UUID,
  p_event_type_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_is_member_history BOOLEAN,
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
    is_member_history = COALESCE(p_is_member_history, FALSE),
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
