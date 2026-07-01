-- ============================================================
-- 043: 楽曲にDance Practice/ひなリハ・コール動画を追加
-- ------------------------------------------------------------
-- - MVとは別に、監督を持たない楽曲関連動画を保持する
-- - 1楽曲につき動画種別ごとに1件まで
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orbit_track_videos (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id      UUID NOT NULL REFERENCES public.orbit_tracks(id) ON DELETE CASCADE,
  video_type    TEXT NOT NULL,
  video_url     TEXT NOT NULL,
  published_on  DATE,
  memo          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orbit_track_videos_video_type_check CHECK (
    video_type IN ('dance_practice', 'call')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orbit_track_videos_unique_type
  ON public.orbit_track_videos (track_id, video_type);

CREATE INDEX IF NOT EXISTS idx_orbit_track_videos_track_id
  ON public.orbit_track_videos (track_id);

ALTER TABLE public.orbit_track_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_track_videos_select" ON public.orbit_track_videos FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_videos_insert" ON public.orbit_track_videos FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_videos_update" ON public.orbit_track_videos FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_videos_delete" ON public.orbit_track_videos FOR DELETE
  USING ((select auth.role()) = 'authenticated');

DROP TRIGGER IF EXISTS orbit_track_videos_updated_at ON public.orbit_track_videos;
CREATE TRIGGER orbit_track_videos_updated_at
  BEFORE UPDATE ON public.orbit_track_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP FUNCTION IF EXISTS public.update_track_with_relations_v2(
  UUID,
  TEXT,
  UUID,
  TEXT,
  TEXT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  JSONB
);

CREATE FUNCTION public.update_track_with_relations_v2(
  p_track_id UUID,
  p_title TEXT,
  p_group_id UUID,
  p_label TEXT,
  p_generation TEXT,
  p_release_links JSONB,
  p_credits JSONB,
  p_formation_rows JSONB,
  p_mv JSONB,
  p_videos JSONB,
  p_costumes JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.orbit_tracks
  SET
    group_id = p_group_id,
    label = p_label,
    generation = p_generation
  WHERE id = p_track_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'track not found: %', p_track_id USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.update_track_with_relations(
    p_track_id,
    p_title,
    p_release_links,
    p_credits,
    p_formation_rows,
    p_mv,
    p_costumes
  );

  DELETE FROM public.orbit_track_videos
  WHERE track_id = p_track_id;

  INSERT INTO public.orbit_track_videos (
    track_id,
    video_type,
    video_url,
    published_on,
    memo
  )
  SELECT
    p_track_id,
    video.video_type,
    video.video_url,
    video.published_on,
    video.memo
  FROM (
    SELECT
      NULLIF(BTRIM(item->>'type'), '') AS video_type,
      NULLIF(BTRIM(item->>'url'), '') AS video_url,
      CASE
        WHEN NULLIF(BTRIM(item->>'publishedOn'), '') IS NULL THEN NULL
        ELSE (item->>'publishedOn')::DATE
      END AS published_on,
      NULLIF(BTRIM(item->>'memo'), '') AS memo,
      ord
    FROM jsonb_array_elements(COALESCE(p_videos, '[]'::JSONB)) WITH ORDINALITY AS videos(item, ord)
  ) AS video
  WHERE video.video_type IS NOT NULL
    AND video.video_url IS NOT NULL
    AND (
      video.video_type <> 'dance_practice'
      OR EXISTS (
        SELECT 1
        FROM public.orbit_tracks tracks
        JOIN public.orbit_groups groups
          ON groups.id = tracks.group_id
        WHERE tracks.id = p_track_id
          AND groups.name_ja IN ('櫻坂46', '日向坂46')
      )
    )
  ORDER BY video.ord;
END;
$$;

DROP FUNCTION IF EXISTS public.create_track_with_relations_v2(
  TEXT,
  UUID,
  TEXT,
  TEXT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  JSONB
);

CREATE FUNCTION public.create_track_with_relations_v2(
  p_title TEXT,
  p_group_id UUID,
  p_label TEXT,
  p_generation TEXT,
  p_release_links JSONB,
  p_credits JSONB,
  p_formation_rows JSONB,
  p_mv JSONB,
  p_videos JSONB,
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
    group_id
  )
  VALUES (
    p_title,
    p_group_id
  )
  RETURNING id INTO v_track_id;

  PERFORM public.update_track_with_relations_v2(
    v_track_id,
    p_title,
    p_group_id,
    p_label,
    p_generation,
    p_release_links,
    p_credits,
    p_formation_rows,
    p_mv,
    p_videos,
    p_costumes
  );

  RETURN v_track_id;
END;
$$;
