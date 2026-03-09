-- ============================================================
-- 025: Issue #61 リリース管理の拡張
-- - リリースにアートワーク担当者を保持
-- - リリース側から楽曲紐づけ（曲順）を更新可能にする
-- ============================================================

ALTER TABLE public.orbit_releases
ADD COLUMN IF NOT EXISTS artwork_person_id UUID REFERENCES public.orbit_people(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_orbit_releases_artwork_person_id
  ON public.orbit_releases (artwork_person_id);

DROP FUNCTION IF EXISTS public.update_release_with_relations(
  UUID,
  TEXT,
  UUID,
  TEXT,
  INT,
  DATE,
  TEXT,
  JSONB,
  UUID[]
);

DROP FUNCTION IF EXISTS public.update_release_with_relations(
  UUID,
  TEXT,
  UUID,
  TEXT,
  INT,
  DATE,
  TEXT,
  TEXT,
  JSONB,
  UUID[],
  JSONB
);

CREATE FUNCTION public.update_release_with_relations(
  p_release_id UUID,
  p_title TEXT,
  p_group_id UUID,
  p_release_type TEXT,
  p_numbering INT,
  p_release_date DATE,
  p_artwork_path TEXT,
  p_artwork_person_name TEXT,
  p_bonus_videos JSONB,
  p_member_ids UUID[],
  p_track_links JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_artwork_person_name TEXT;
  v_artwork_person_id UUID;
BEGIN
  v_artwork_person_name := NULLIF(BTRIM(COALESCE(p_artwork_person_name, '')), '');
  v_artwork_person_id := NULL;

  IF v_artwork_person_name IS NOT NULL THEN
    INSERT INTO public.orbit_people (display_name)
    VALUES (v_artwork_person_name)
    ON CONFLICT (display_name) DO NOTHING;

    SELECT id
    INTO v_artwork_person_id
    FROM public.orbit_people
    WHERE display_name = v_artwork_person_name;
  END IF;

  UPDATE public.orbit_releases
  SET
    title = p_title,
    group_id = p_group_id,
    release_type = p_release_type,
    numbering = p_numbering,
    release_date = p_release_date,
    artwork_path = p_artwork_path,
    artwork_person_id = v_artwork_person_id
  WHERE id = p_release_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'release not found: %', p_release_id USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.orbit_release_bonus_videos
  WHERE release_id = p_release_id;

  INSERT INTO public.orbit_release_bonus_videos (
    release_id,
    edition,
    title,
    description,
    sort_order
  )
  SELECT
    p_release_id,
    bonus.edition,
    bonus.title,
    bonus.description,
    bonus.sort_order
  FROM (
    SELECT
      NULLIF(BTRIM(item->>'edition'), '') AS edition,
      NULLIF(BTRIM(item->>'title'), '') AS title,
      NULLIF(BTRIM(item->>'description'), '') AS description,
      (ord - 1)::INT AS sort_order
    FROM jsonb_array_elements(COALESCE(p_bonus_videos, '[]'::JSONB)) WITH ORDINALITY AS bonus(item, ord)
  ) AS bonus
  WHERE bonus.edition IS NOT NULL
    AND bonus.title IS NOT NULL
  ORDER BY bonus.sort_order;

  DELETE FROM public.orbit_release_members
  WHERE release_id = p_release_id;

  INSERT INTO public.orbit_release_members (
    release_id,
    member_id
  )
  SELECT
    p_release_id,
    member_id
  FROM (
    SELECT DISTINCT unnest(COALESCE(p_member_ids, ARRAY[]::UUID[])) AS member_id
  ) AS members;

  DELETE FROM public.orbit_release_tracks
  WHERE release_id = p_release_id;

  INSERT INTO public.orbit_release_tracks (
    release_id,
    track_id,
    track_number
  )
  SELECT
    p_release_id,
    link.track_id,
    link.track_number
  FROM (
    SELECT
      (item->>'trackId')::UUID AS track_id,
      (item->>'trackNumber')::INT AS track_number,
      ord
    FROM jsonb_array_elements(COALESCE(p_track_links, '[]'::JSONB)) WITH ORDINALITY AS link(item, ord)
  ) AS link
  WHERE link.track_id IS NOT NULL
    AND link.track_number IS NOT NULL
  ORDER BY link.ord;
END;
$$;

DROP FUNCTION IF EXISTS public.create_release_with_relations(
  TEXT,
  UUID,
  TEXT,
  INT,
  DATE,
  TEXT,
  JSONB,
  UUID[]
);

DROP FUNCTION IF EXISTS public.create_release_with_relations(
  TEXT,
  UUID,
  TEXT,
  INT,
  DATE,
  TEXT,
  TEXT,
  JSONB,
  UUID[],
  JSONB
);

CREATE FUNCTION public.create_release_with_relations(
  p_title TEXT,
  p_group_id UUID,
  p_release_type TEXT,
  p_numbering INT,
  p_release_date DATE,
  p_artwork_path TEXT,
  p_artwork_person_name TEXT,
  p_bonus_videos JSONB,
  p_member_ids UUID[],
  p_track_links JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_release_id UUID;
BEGIN
  INSERT INTO public.orbit_releases (
    title,
    group_id,
    release_type,
    numbering,
    release_date
  )
  VALUES (
    p_title,
    p_group_id,
    p_release_type,
    p_numbering,
    p_release_date
  )
  RETURNING id INTO v_release_id;

  PERFORM public.update_release_with_relations(
    v_release_id,
    p_title,
    p_group_id,
    p_release_type,
    p_numbering,
    p_release_date,
    p_artwork_path,
    p_artwork_person_name,
    p_bonus_videos,
    p_member_ids,
    p_track_links
  );

  RETURN v_release_id;
END;
$$;
