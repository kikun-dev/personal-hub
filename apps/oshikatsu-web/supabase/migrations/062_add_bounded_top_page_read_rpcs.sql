-- ============================================================
-- 062: Top Page の read を archive 非比例・固定 transport 数にする
-- ------------------------------------------------------------
-- ライブ、リリース、MV/関連動画の「今日はなんの日」候補を
-- 月日一致の行だけ返す小さな read RPC として追加する。
-- MV/関連動画のカレンダー窓は UNION RPC で1 transportにまとめる。
-- Issue #365
-- ============================================================

-- 月日一致RPCが通常のdate indexではなく式indexを利用できるようにする。
CREATE INDEX IF NOT EXISTS idx_orbit_live_performances_date_month_day
  ON public.orbit_live_performances (
    (EXTRACT(MONTH FROM performance_date)),
    (EXTRACT(DAY FROM performance_date))
  )
  WHERE performance_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orbit_releases_date_month_day
  ON public.orbit_releases (
    (EXTRACT(MONTH FROM release_date)),
    (EXTRACT(DAY FROM release_date))
  )
  WHERE release_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orbit_track_mvs_published_on
  ON public.orbit_track_mvs (published_on)
  WHERE published_on IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orbit_track_mvs_published_on_month_day
  ON public.orbit_track_mvs (
    (EXTRACT(MONTH FROM published_on)),
    (EXTRACT(DAY FROM published_on))
  )
  WHERE published_on IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orbit_track_videos_published_on
  ON public.orbit_track_videos (published_on)
  WHERE published_on IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orbit_track_videos_published_on_month_day
  ON public.orbit_track_videos (
    (EXTRACT(MONTH FROM published_on)),
    (EXTRACT(DAY FROM published_on))
  )
  WHERE published_on IS NOT NULL;

CREATE OR REPLACE FUNCTION public.find_orbit_live_performances_on_this_day(
  target_month INT,
  target_day INT
)
RETURNS TABLE (
  id UUID,
  live_id UUID,
  live_name TEXT,
  date DATE,
  starts_at TEXT,
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

CREATE OR REPLACE FUNCTION public.find_orbit_calendar_videos_in_ranges(
  range_1_start DATE,
  range_1_end DATE,
  range_2_start DATE,
  range_2_end DATE
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
    AND (
      (mvs.published_on >= range_1_start AND mvs.published_on < range_1_end)
      OR (
        range_2_start IS NOT NULL
        AND range_2_end IS NOT NULL
        AND mvs.published_on >= range_2_start
        AND mvs.published_on < range_2_end
      )
    )

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
    AND (
      (videos.published_on >= range_1_start AND videos.published_on < range_1_end)
      OR (
        range_2_start IS NOT NULL
        AND range_2_end IS NOT NULL
        AND videos.published_on >= range_2_start
        AND videos.published_on < range_2_end
      )
    )

  ORDER BY date, track_title, track_id, video_type;
$$;

-- 既存の read RPC と同じく RLS は呼び出し元ロールで評価する。
GRANT EXECUTE ON FUNCTION public.find_orbit_live_performances_on_this_day(INT, INT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_orbit_releases_on_this_day(INT, INT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_orbit_calendar_videos_on_this_day(INT, INT)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_orbit_calendar_videos_in_ranges(DATE, DATE, DATE, DATE)
  TO anon, authenticated;

-- ロールバック: 上記4関数を引数型付きで DROP FUNCTION し、6 indexをDROPする。
