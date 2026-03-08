-- ============================================================
-- メンバーメモ追加
-- ============================================================
ALTER TABLE public.orbit_members
  ADD COLUMN IF NOT EXISTS memo TEXT;

-- ============================================================
-- レギュラー仕事廃止
-- ============================================================
DROP TABLE IF EXISTS public.orbit_member_regular_works;

-- ============================================================
-- メンバー来歴
-- ============================================================
CREATE TABLE public.orbit_member_histories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id   UUID NOT NULL REFERENCES public.orbit_members(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  event       TEXT NOT NULL,
  note        TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orbit_member_histories_event_length_check CHECK (char_length(event) <= 100),
  CONSTRAINT orbit_member_histories_note_length_check CHECK (note IS NULL OR char_length(note) <= 500)
);

CREATE INDEX idx_orbit_member_histories_member
  ON public.orbit_member_histories (member_id);

ALTER TABLE public.orbit_member_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_member_histories_select" ON public.orbit_member_histories FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_member_histories_insert" ON public.orbit_member_histories FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_member_histories_update" ON public.orbit_member_histories FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_member_histories_delete" ON public.orbit_member_histories FOR DELETE
  USING ((select auth.role()) = 'authenticated');

-- ============================================================
-- メンバー更新RPC差し替え（memo + histories）
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
  p_sns JSONB,
  p_histories JSONB
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

  DELETE FROM public.orbit_member_groups WHERE member_id = p_member_id;
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

  DELETE FROM public.orbit_member_sns WHERE member_id = p_member_id;
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

  DELETE FROM public.orbit_member_histories WHERE member_id = p_member_id;
  INSERT INTO public.orbit_member_histories (
    member_id,
    date,
    event,
    note,
    sort_order
  )
  SELECT
    p_member_id,
    (history_item->>'date')::DATE,
    history_item->>'event',
    NULLIF(history_item->>'note', ''),
    COALESCE((history_item->>'sort_order')::INT, 0)
  FROM jsonb_array_elements(COALESCE(p_histories, '[]'::JSONB)) AS history_item;
END;
$$;
