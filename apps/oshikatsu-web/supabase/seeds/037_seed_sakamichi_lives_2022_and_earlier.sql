-- ============================================================
-- Orbit starter seed: Sakamichi 2022 and earlier lives
-- ============================================================
-- Scope:
-- - 2022年以前の 乃木坂46 / 櫻坂46 / 日向坂46 の主要ライブ初期データ。
-- - 公式特設ページ・公式ニュースで公演日程・会場を確認できたものを登録する。
-- - チケット情報は空欄（ticket_info NULL）で投入する。
-- - セットリストは、完全かつ信頼できる公開情報を確認できたものだけ後続 seed で追加する。
--
-- Notes:
-- - Existing rows are matched by live name and performance natural keys.
-- - 034_seed_sakamichi_venues.sql に存在しない会場のみ、この seed で補う。
--
-- Main sources checked:
-- - 乃木坂46 10th YEAR BIRTHDAY LIVE
--   https://www.nogizaka46.com/s/n46/page/10th_birthday_live
-- - 乃木坂46 真夏の全国ツアー2022
--   https://www.nogizaka46.com/s/n46/page/summer_tour2022
-- - 櫻坂46 1st TOUR 2021
--   https://sakurazaka46.com/s/s46/page/tour2021
-- - 櫻坂46 1st YEAR ANNIVERSARY LIVE
--   https://sakurazaka46.com/s/s46/page/1st_anniversary
-- - 櫻坂46 2nd TOUR 2022 "As you know?"
--   https://sakurazaka46.com/s/s46/page/tour2022
-- - 日向坂46 3周年記念MEMORIAL LIVE ～3回目のひな誕祭～
--   https://www.hinatazaka46.com/s/official/news/detail/E00201
--   https://www.hinatazaka46.com/s/official/page/3rd-anniversary
-- - 日向坂46 Happy Smile Tour 2022
--   https://www.hinatazaka46.com/s/official/page/tour2022
-- ============================================================

DO $seed$
BEGIN
DROP TABLE IF EXISTS orbit_seed_2022_venues;
DROP TABLE IF EXISTS orbit_seed_2022_lives;
DROP TABLE IF EXISTS orbit_seed_2022_performances;

CREATE TEMP TABLE orbit_seed_2022_venues (
  name TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  capacity INT,
  map_url TEXT,
  official_url TEXT,
  access TEXT,
  notes TEXT
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE orbit_seed_2022_lives (
  name TEXT NOT NULL,
  live_type TEXT NOT NULL,
  performer_group_names TEXT[] NOT NULL,
  description TEXT
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE orbit_seed_2022_performances (
  live_name TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  performance_date DATE NOT NULL,
  doors_open_at TEXT,
  starts_at TEXT,
  has_streaming BOOLEAN NOT NULL DEFAULT false,
  has_live_viewing BOOLEAN NOT NULL DEFAULT false,
  seat_info TEXT,
  sort_order INT NOT NULL
) ON COMMIT PRESERVE ROWS;

INSERT INTO orbit_seed_2022_venues (
  name,
  prefecture,
  capacity,
  map_url,
  official_url,
  access,
  notes
)
VALUES
  (
    '日産スタジアム',
    '神奈川県',
    NULL,
    'https://www.google.com/maps/search/?api=1&query=日産スタジアム',
    'https://www.nissan-stadium.jp/',
    NULL,
    '参考公演: 乃木坂46 10th YEAR BIRTHDAY LIVE'
  );

UPDATE public.orbit_venues AS venue
SET
  prefecture = COALESCE(NULLIF(venue.prefecture, ''), seed.prefecture),
  capacity = COALESCE(venue.capacity, seed.capacity),
  map_url = COALESCE(NULLIF(venue.map_url, ''), seed.map_url),
  official_url = COALESCE(NULLIF(venue.official_url, ''), seed.official_url),
  access = COALESCE(NULLIF(venue.access, ''), seed.access),
  notes = COALESCE(NULLIF(venue.notes, ''), seed.notes)
FROM orbit_seed_2022_venues seed
WHERE venue.name = seed.name;

INSERT INTO public.orbit_venues (
  name,
  prefecture,
  capacity,
  map_url,
  official_url,
  access,
  notes
)
SELECT
  seed.name,
  seed.prefecture,
  seed.capacity,
  seed.map_url,
  seed.official_url,
  seed.access,
  seed.notes
FROM orbit_seed_2022_venues seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_venues existing
  WHERE existing.name = seed.name
);

INSERT INTO orbit_seed_2022_lives (
  name,
  live_type,
  performer_group_names,
  description
)
VALUES
  (
    '乃木坂46 10th YEAR BIRTHDAY LIVE',
    'single',
    ARRAY['乃木坂46'],
    '日産スタジアムで開催された乃木坂46の10周年記念ライブ。'
  ),
  (
    '乃木坂46 真夏の全国ツアー2022',
    'tour',
    ARRAY['乃木坂46'],
    '公式特設ページで配信対象として確認できた明治神宮野球場公演を登録。'
  ),
  (
    '櫻坂46 1st TOUR 2021',
    'tour',
    ARRAY['櫻坂46'],
    '福岡・愛知・大阪・埼玉を回った櫻坂46初の全国ツアー。'
  ),
  (
    '櫻坂46 1st YEAR ANNIVERSARY LIVE',
    'single',
    ARRAY['櫻坂46'],
    '日本武道館で開催された櫻坂46の1周年記念ライブ。'
  ),
  (
    '櫻坂46 2nd TOUR 2022 "As you know?"',
    'tour',
    ARRAY['櫻坂46'],
    '大阪・広島・宮城・愛知・福岡・東京を回った全国ツアー。'
  ),
  (
    '日向坂46 3周年記念MEMORIAL LIVE ～3回目のひな誕祭～',
    'single',
    ARRAY['日向坂46'],
    '東京ドームで開催された日向坂46の3周年記念ライブ。'
  ),
  (
    '日向坂46 Happy Smile Tour 2022',
    'tour',
    ARRAY['日向坂46'],
    '愛知・兵庫・神奈川・東京を回った全国ツアー。'
  );

UPDATE public.orbit_lives AS live
SET
  live_type = seed.live_type,
  description = seed.description
FROM orbit_seed_2022_lives seed
WHERE live.name = seed.name;

INSERT INTO public.orbit_lives (
  name,
  live_type,
  description
)
SELECT
  seed.name,
  seed.live_type,
  seed.description
FROM orbit_seed_2022_lives seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_lives existing
  WHERE existing.name = seed.name
);

INSERT INTO public.orbit_live_performer_groups (
  live_id,
  group_id
)
SELECT DISTINCT
  live.id,
  groups.id
FROM orbit_seed_2022_lives seed
JOIN public.orbit_lives live
  ON live.name = seed.name
JOIN LATERAL unnest(seed.performer_group_names) AS group_name(name)
  ON true
JOIN public.orbit_groups groups
  ON groups.name_ja = group_name.name
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_live_performer_groups existing
  WHERE existing.live_id = live.id
    AND existing.group_id = groups.id
);

INSERT INTO orbit_seed_2022_performances (
  live_name,
  venue_name,
  performance_date,
  doors_open_at,
  starts_at,
  has_streaming,
  has_live_viewing,
  seat_info,
  sort_order
)
VALUES
  ('乃木坂46 10th YEAR BIRTHDAY LIVE', '日産スタジアム', '2022-05-14', '14:30', '17:00', true, false, NULL, 0),
  ('乃木坂46 10th YEAR BIRTHDAY LIVE', '日産スタジアム', '2022-05-15', '14:30', '17:00', true, false, NULL, 1),

  ('乃木坂46 真夏の全国ツアー2022', '明治神宮野球場', '2022-08-30', '17:00', '18:00', true, false, NULL, 0),
  ('乃木坂46 真夏の全国ツアー2022', '明治神宮野球場', '2022-08-31', '17:00', '18:00', true, false, NULL, 1),

  ('櫻坂46 1st TOUR 2021', '西日本総合展示場 新館', '2021-09-11', '17:00', '18:30', false, false, NULL, 0),
  ('櫻坂46 1st TOUR 2021', '西日本総合展示場 新館', '2021-09-12', '16:00', '17:30', false, false, NULL, 1),
  ('櫻坂46 1st TOUR 2021', 'Aichi Sky Expo ホールA', '2021-09-19', '16:00', '17:30', false, false, NULL, 2),
  ('櫻坂46 1st TOUR 2021', 'Aichi Sky Expo ホールA', '2021-09-20', '16:00', '17:30', false, false, NULL, 3),
  ('櫻坂46 1st TOUR 2021', '丸善インテックアリーナ大阪', '2021-10-09', '16:00', '17:30', false, false, NULL, 4),
  ('櫻坂46 1st TOUR 2021', '丸善インテックアリーナ大阪', '2021-10-10', '16:00', '17:30', false, false, NULL, 5),
  ('櫻坂46 1st TOUR 2021', 'さいたまスーパーアリーナ', '2021-10-29', '17:00', '18:30', false, false, NULL, 6),
  ('櫻坂46 1st TOUR 2021', 'さいたまスーパーアリーナ', '2021-10-30', '16:00', '17:30', false, false, NULL, 7),
  ('櫻坂46 1st TOUR 2021', 'さいたまスーパーアリーナ', '2021-10-31', '16:00', '17:30', false, false, NULL, 8),

  ('櫻坂46 1st YEAR ANNIVERSARY LIVE', '日本武道館', '2021-12-09', '17:30', '18:30', false, false, NULL, 0),
  ('櫻坂46 1st YEAR ANNIVERSARY LIVE', '日本武道館', '2021-12-10', '17:30', '18:30', true, false, NULL, 1),

  ('櫻坂46 2nd TOUR 2022 "As you know?"', '丸善インテックアリーナ大阪', '2022-09-29', '16:30', '18:00', false, false, NULL, 0),
  ('櫻坂46 2nd TOUR 2022 "As you know?"', '丸善インテックアリーナ大阪', '2022-09-30', '16:30', '18:00', false, false, NULL, 1),
  ('櫻坂46 2nd TOUR 2022 "As you know?"', '広島サンプラザホール', '2022-10-05', '16:30', '18:00', false, false, NULL, 2),
  ('櫻坂46 2nd TOUR 2022 "As you know?"', '広島サンプラザホール', '2022-10-06', '16:30', '18:00', false, false, NULL, 3),
  ('櫻坂46 2nd TOUR 2022 "As you know?"', 'セキスイハイムスーパーアリーナ', '2022-10-15', '16:00', '17:30', false, false, NULL, 4),
  ('櫻坂46 2nd TOUR 2022 "As you know?"', 'セキスイハイムスーパーアリーナ', '2022-10-16', '16:00', '17:30', false, false, NULL, 5),
  ('櫻坂46 2nd TOUR 2022 "As you know?"', '日本ガイシホール', '2022-10-21', '16:30', '18:00', false, false, NULL, 6),
  ('櫻坂46 2nd TOUR 2022 "As you know?"', '日本ガイシホール', '2022-10-22', '16:00', '17:30', false, false, NULL, 7),
  ('櫻坂46 2nd TOUR 2022 "As you know?"', '西日本総合展示場 新館', '2022-10-25', '16:30', '18:00', false, false, NULL, 8),
  ('櫻坂46 2nd TOUR 2022 "As you know?"', '西日本総合展示場 新館', '2022-10-26', '16:30', '18:00', false, false, NULL, 9),
  ('櫻坂46 2nd TOUR 2022 "As you know?"', '東京ドーム', '2022-11-08', '15:00', '18:00', false, false, NULL, 10),
  ('櫻坂46 2nd TOUR 2022 "As you know?"', '東京ドーム', '2022-11-09', '15:00', '18:00', true, false, NULL, 11),

  ('日向坂46 3周年記念MEMORIAL LIVE ～3回目のひな誕祭～', '東京ドーム', '2022-03-30', '14:30', '17:30', true, false, NULL, 0),
  ('日向坂46 3周年記念MEMORIAL LIVE ～3回目のひな誕祭～', '東京ドーム', '2022-03-31', '14:30', '17:30', true, false, NULL, 1),

  ('日向坂46 Happy Smile Tour 2022', 'Aichi Sky Expo ホールA', '2022-09-10', '16:00', '17:30', false, false, NULL, 0),
  ('日向坂46 Happy Smile Tour 2022', 'Aichi Sky Expo ホールA', '2022-09-11', '16:00', '17:30', false, false, NULL, 1),
  ('日向坂46 Happy Smile Tour 2022', '神戸ワールド記念ホール', '2022-09-17', '16:00', '17:30', false, false, NULL, 2),
  ('日向坂46 Happy Smile Tour 2022', '神戸ワールド記念ホール', '2022-09-18', '16:00', '17:30', false, false, NULL, 3),
  ('日向坂46 Happy Smile Tour 2022', 'ぴあアリーナMM', '2022-10-17', '16:30', '18:00', false, false, NULL, 4),
  ('日向坂46 Happy Smile Tour 2022', 'ぴあアリーナMM', '2022-10-18', '16:30', '18:00', false, false, NULL, 5),
  ('日向坂46 Happy Smile Tour 2022', '国立代々木競技場第一体育館', '2022-11-12', '16:00', '17:30', false, false, NULL, 6),
  ('日向坂46 Happy Smile Tour 2022', '国立代々木競技場第一体育館', '2022-11-13', '16:00', '17:30', true, false, NULL, 7);

UPDATE public.orbit_live_performances AS performance
SET
  doors_open_at = NULLIF(seed.doors_open_at, ''),
  starts_at = NULLIF(seed.starts_at, ''),
  has_streaming = seed.has_streaming,
  has_live_viewing = seed.has_live_viewing,
  seat_info = COALESCE(NULLIF(performance.seat_info, ''), NULLIF(seed.seat_info, '')),
  sort_order = seed.sort_order
FROM orbit_seed_2022_performances seed
JOIN public.orbit_lives live
  ON live.name = seed.live_name
JOIN public.orbit_venues venue
  ON venue.name = seed.venue_name
WHERE performance.live_id = live.id
  AND performance.venue_id = venue.id
  AND performance.performance_date = seed.performance_date
  AND performance.starts_at IS NOT DISTINCT FROM NULLIF(seed.starts_at, '');

INSERT INTO public.orbit_live_performances (
  live_id,
  venue_id,
  performance_date,
  doors_open_at,
  starts_at,
  has_streaming,
  has_live_viewing,
  ticket_info,
  seat_info,
  sort_order
)
SELECT
  live.id,
  venue.id,
  seed.performance_date,
  NULLIF(seed.doors_open_at, ''),
  NULLIF(seed.starts_at, ''),
  seed.has_streaming,
  seed.has_live_viewing,
  NULL,
  NULLIF(seed.seat_info, ''),
  seed.sort_order
FROM orbit_seed_2022_performances seed
JOIN public.orbit_lives live
  ON live.name = seed.live_name
JOIN public.orbit_venues venue
  ON venue.name = seed.venue_name
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_live_performances existing
  WHERE existing.live_id = live.id
    AND existing.venue_id = venue.id
    AND existing.performance_date = seed.performance_date
    AND existing.starts_at IS NOT DISTINCT FROM NULLIF(seed.starts_at, '')
);

DROP TABLE IF EXISTS orbit_seed_2022_performances;
DROP TABLE IF EXISTS orbit_seed_2022_lives;
DROP TABLE IF EXISTS orbit_seed_2022_venues;
END;
$seed$;
