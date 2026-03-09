-- ============================================================
-- 026: 楽曲にグループを保持し、楽曲更新RPCを拡張
-- - orbit_tracks.group_id 追加（NOT NULL）
-- - group_id 付きRPC（*_v2）を追加
-- 前提: 既存楽曲データ投入前に適用する
-- ============================================================

ALTER TABLE public.orbit_tracks
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.orbit_groups(id) ON DELETE RESTRICT;

ALTER TABLE public.orbit_tracks
ALTER COLUMN group_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orbit_tracks_group_id
  ON public.orbit_tracks (group_id);

DROP FUNCTION IF EXISTS public.update_track_with_relations_v2(
  UUID,
  TEXT,
  UUID,
  INT,
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
  p_duration_seconds INT,
  p_release_links JSONB,
  p_credits JSONB,
  p_formation_rows JSONB,
  p_mv JSONB,
  p_costumes JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.orbit_tracks
  SET group_id = p_group_id
  WHERE id = p_track_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'track not found: %', p_track_id USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.update_track_with_relations(
    p_track_id,
    p_title,
    p_duration_seconds,
    p_release_links,
    p_credits,
    p_formation_rows,
    p_mv,
    p_costumes
  );
END;
$$;

DROP FUNCTION IF EXISTS public.create_track_with_relations_v2(
  TEXT,
  UUID,
  INT,
  JSONB,
  JSONB,
  JSONB,
  JSONB,
  JSONB
);

CREATE FUNCTION public.create_track_with_relations_v2(
  p_title TEXT,
  p_group_id UUID,
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
    group_id,
    duration_seconds
  )
  VALUES (
    p_title,
    p_group_id,
    p_duration_seconds
  )
  RETURNING id INTO v_track_id;

  PERFORM public.update_track_with_relations_v2(
    v_track_id,
    p_title,
    p_group_id,
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
