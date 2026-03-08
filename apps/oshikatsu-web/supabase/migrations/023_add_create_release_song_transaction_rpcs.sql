-- ============================================================
-- 023: リリース/楽曲の作成をRPCでトランザクション化
-- ============================================================

-- ============================================================
-- release create RPC
-- ============================================================
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

CREATE FUNCTION public.create_release_with_relations(
  p_title TEXT,
  p_group_id UUID,
  p_release_type TEXT,
  p_numbering INT,
  p_release_date DATE,
  p_artwork_path TEXT,
  p_bonus_videos JSONB,
  p_member_ids UUID[]
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
    release_date,
    artwork_path
  )
  VALUES (
    p_title,
    p_group_id,
    p_release_type,
    p_numbering,
    p_release_date,
    p_artwork_path
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
    p_bonus_videos,
    p_member_ids
  );

  RETURN v_release_id;
END;
$$;

-- ============================================================
-- song create RPC
-- ============================================================
DROP FUNCTION IF EXISTS public.create_track_with_relations(
  TEXT,
  INT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  JSONB
);

CREATE FUNCTION public.create_track_with_relations(
  p_title TEXT,
  p_duration_seconds INT,
  p_release_links JSONB,
  p_credits JSONB,
  p_formation_rows JSONB,
  p_mv JSONB,
  p_costumes JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_track_id UUID;
BEGIN
  INSERT INTO public.orbit_tracks (
    title,
    duration_seconds
  )
  VALUES (
    p_title,
    p_duration_seconds
  )
  RETURNING id INTO v_track_id;

  PERFORM public.update_track_with_relations(
    v_track_id,
    p_title,
    p_duration_seconds,
    p_release_links,
    p_credits,
    p_formation_rows,
    p_mv,
    p_costumes
  );

  RETURN v_track_id;
END;
$$;

-- ============================================================
-- 楽曲は作成時にも必ず1件以上のリリース紐づけを持つ
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_inserted_track_has_release_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.orbit_release_tracks
    WHERE track_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'track must be linked to at least one release: %', NEW.id USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS orbit_tracks_require_link_after_insert
  ON public.orbit_tracks;

CREATE CONSTRAINT TRIGGER orbit_tracks_require_link_after_insert
AFTER INSERT ON public.orbit_tracks
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.ensure_inserted_track_has_release_link();
