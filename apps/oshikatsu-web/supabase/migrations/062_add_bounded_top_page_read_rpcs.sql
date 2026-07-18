-- ============================================================
-- 062: Top Page の月日一致 read を archive 非比例にする
-- ------------------------------------------------------------
-- ライブ、リリース、MV/関連動画の「今日はなんの日」候補を
-- 月日一致の行だけ返す小さな read RPC として追加する。
-- Issue #365
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_orbit_live_performances_on_this_day(
  target_month INT,
  target_day INT
)
RETURNS TABLE (
  id UUID,
  live_id UUID,
  live_name TEXT,
  date DATE,
  starts_at TIME,
  venue_name TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    performances.id,
    performances.live_id,
    lives.name AS live_name,
    performances.performance_date AS date,
    performances.starts_at,
    venues.name AS venue_name
  FROM public.orbit_live_performances performances
  JOIN public.orbit_lives lives
    ON lives.id = performances.live_id
  LEFT JOIN public.orbit_venues venues
    ON venues.id = performances.venue_id
  WHERE performances.performance_date IS NOT NULL
    AND EXTRACT(MONTH FROM performances.performance_date) = target_month
    AND EXTRACT(DAY FROM performances.performance_date) = target_day
  ORDER BY performances.performance_date, performances.starts_at NULLS FIRST,
    performances.sort_order, performances.id;
$$;

CREATE OR REPLACE FUNCTION public.find_orbit_releases_on_this_day(
  target_month INT,
  target_day INT
)
RETURNS TABLE (
  release_id UUID,
  title TEXT,
  date DATE
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    releases.id AS release_id,
    releases.title,
    releases.release_date AS date
  FROM public.orbit_releases releases
  WHERE releases.release_date IS NOT NULL
    AND EXTRACT(MONTH FROM releases.release_date) = target_month
    AND EXTRACT(DAY FROM releases.release_date) = target_day
  ORDER BY releases.release_date, releases.title, releases.id;
$$;

CREATE OR REPLACE FUNCTION public.find_orbit_calendar_videos_on_this_day(
  target_month INT,
  target_day INT
)
RETURNS TABLE (
  track_id UUID,
  track_title TEXT,
  group_name_ja TEXT,
  video_type TEXT,
  url TEXT,
  date DATE
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    tracks.id AS track_id,
    tracks.title AS track_title,
    groups.name_ja AS group_name_ja,
    'mv'::TEXT AS video_type,
    mvs.mv_url AS url,
    mvs.published_on AS date
  FROM public.orbit_track_mvs mvs
  JOIN public.orbit_tracks tracks
    ON tracks.id = mvs.track_id
  JOIN public.orbit_groups groups
    ON groups.id = tracks.group_id
  WHERE mvs.published_on IS NOT NULL
    AND EXTRACT(MONTH FROM mvs.published_on) = target_month
    AND EXTRACT(DAY FROM mvs.published_on) = target_day

  UNION ALL

  SELECT
    tracks.id AS track_id,
    tracks.title AS track_title,
    groups.name_ja AS group_name_ja,
    videos.video_type,
    videos.video_url AS url,
    videos.published_on AS date
  FROM public.orbit_track_videos videos
  JOIN public.orbit_tracks tracks
    ON tracks.id = videos.track_id
  JOIN public.orbit_groups groups
    ON groups.id = tracks.group_id
  WHERE videos.published_on IS NOT NULL
    AND EXTRACT(MONTH FROM videos.published_on) = target_month
    AND EXTRACT(DAY FROM videos.published_on) = target_day

  ORDER BY date, track_title, track_id, video_type;
$$;

-- 既存の read RPC と同じく RLS は呼び出し元ロールで評価する。
GRANT EXECUTE ON FUNCTION public.find_orbit_live_performances_on_this_day(INT, INT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_orbit_releases_on_this_day(INT, INT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_orbit_calendar_videos_on_this_day(INT, INT)
  TO anon, authenticated;

-- ロールバック: 上記3関数を引数型付きで DROP FUNCTION する。
