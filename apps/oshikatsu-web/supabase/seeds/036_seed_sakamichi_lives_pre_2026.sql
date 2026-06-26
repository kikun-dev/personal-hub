-- ============================================================
-- Orbit starter seed: Sakamichi pre-2026 lives
-- ============================================================
-- Scope:
-- - 2026年より前の 乃木坂46 / 櫻坂46 / 日向坂46 の主要ライブ初期データ。
-- - 公式特設ページで公演日程・会場を確認できた 2023 年以降の主要公演を中心に登録する。
-- - チケット情報は空欄（ticket_info NULL）で投入する。
-- - セットリストは、完全かつ信頼できる公開情報を確認できたものだけ後続 seed で追加する。
--
-- Notes:
-- - Existing rows are matched by live name and performance natural keys.
-- - Missing venues found during curation are inserted here to keep this seed self-contained.
--
-- Main sources checked:
-- - 乃木坂46 真夏の全国ツアー2025
--   https://www.nogizaka46.com/s/n46/page/summer_tour2025
-- - 乃木坂46 13th YEAR BIRTHDAY LIVE
--   https://www.nogizaka46.com/s/n46/page/13th_birthday_live
-- - 乃木坂46 真夏の全国ツアー2024
--   https://www.nogizaka46.com/s/n46/page/summer_tour2024
-- - 乃木坂46 11th YEAR BIRTHDAY LIVE
--   https://www.nogizaka46.com/s/n46/page/11th_birthday_live
-- - YUUKI YODA GRADUATION CONCERT
--   https://zh.wikipedia.org/wiki/YUUKI_YODA_GRADUATION_CONCERT
-- - 櫻坂46 5th TOUR 2025 "Addiction"
--   https://sakurazaka46.com/s/s46/page/nationaltour2025
-- - 櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-
--   https://sakurazaka46.com/s/s46/page/arenatour
-- - 櫻坂46 3rd TOUR 2023
--   https://sakurazaka46.com/s/s46/page/tour2023
-- - 櫻坂46 8th Single BACKS LIVE!!
--   https://sakurazaka46.com/s/s46/page/backslive_8th
-- - 櫻坂46 9th Single BACKS LIVE!!
--   https://sakurazaka46.com/s/s46/page/backslive_9th
-- - 櫻坂46 三期生ライブ
--   https://sakurazaka46.com/s/s46/page/3rd_generation_live
-- - 櫻坂46 10th Single BACKS LIVE!!
--   https://sakurazaka46.com/s/s46/page/backslive_10th
-- - 櫻坂46 11th Single BACKS LIVE!!
--   https://sakurazaka46.com/s/s46/page/backslive_11th
-- - 櫻坂46 12th Single BACKS LIVE!!
--   https://sakurazaka46.com/s/s46/page/backslive_12th
-- - 櫻坂46 4th YEAR ANNIVERSARY LIVE
--   https://sakurazaka46.com/s/s46/page/4th_anniversary
-- - 日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"
--   https://www.hinatazaka46.com/s/official/page/tour2025
-- - 日向坂46 6回目のひな誕祭
--   https://www.hinatazaka46.com/s/official/page/6th-anniversary
-- - 日向坂46 BRAND NEW LIVE 2025 "OVER THE RAINBOW"
--   https://www.hinatazaka46.com/s/official/page/over_the_rainbow
-- - 日向坂46 Happy Magical Tour 2024
--   https://www.hinatazaka46.com/s/official/page/tour2024
-- - 日向坂46 Happy Train Tour 2023
--   https://www.hinatazaka46.com/s/official/page/tour2023
-- - 日向坂46 5回目のひな誕祭
--   https://www.hinatazaka46.com/s/official/page/5th-anniversary
-- - 日向坂46 四期生ライブ
--   https://www.hinatazaka46.com/s/official/page/4th_memberslive
-- - ひなたフェス2024
--   https://www.hinatazaka46.com/s/official/page/hinata_fes2024
-- - 日向坂46 12th Single ひなた坂46 LIVE
--   https://www.hinatazaka46.com/s/official/page/12thSG_hiraganalive
-- ============================================================

DO $seed$
BEGIN
DROP TABLE IF EXISTS orbit_seed_pre_2026_venues;
DROP TABLE IF EXISTS orbit_seed_pre_2026_lives;
DROP TABLE IF EXISTS orbit_seed_pre_2026_performances;

CREATE TEMP TABLE orbit_seed_pre_2026_venues (
  name TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  capacity INT,
  map_url TEXT,
  official_url TEXT,
  access TEXT,
  notes TEXT
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE orbit_seed_pre_2026_lives (
  name TEXT NOT NULL,
  live_type TEXT NOT NULL,
  performer_group_names TEXT[] NOT NULL,
  description TEXT
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE orbit_seed_pre_2026_performances (
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

INSERT INTO orbit_seed_pre_2026_venues (
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
    'みずほPayPayドーム福岡',
    '福岡県',
    38500,
    'https://www.google.com/maps/search/?api=1&query=みずほPayPayドーム福岡',
    'https://www.softbankhawks.co.jp/stadium/',
    NULL,
    '参考公演: YUUKI YODA GRADUATION CONCERT'
  ),
  (
    'バンテリンドーム ナゴヤ',
    '愛知県',
    50619,
    'https://www.google.com/maps/search/?api=1&query=バンテリンドーム ナゴヤ',
    'https://www.nagoya-dome.co.jp/',
    NULL,
    '参考公演: 乃木坂46 真夏の全国ツアー2024'
  ),
  (
    'ひなたサンマリンスタジアム宮崎',
    '宮崎県',
    NULL,
    'https://www.google.com/maps/search/?api=1&query=ひなたサンマリンスタジアム宮崎',
    NULL,
    NULL,
    '参考公演: ひなたフェス2024'
  );

UPDATE public.orbit_venues AS venue
SET
  prefecture = COALESCE(NULLIF(venue.prefecture, ''), seed.prefecture),
  capacity = COALESCE(venue.capacity, seed.capacity),
  map_url = COALESCE(NULLIF(venue.map_url, ''), seed.map_url),
  official_url = COALESCE(NULLIF(venue.official_url, ''), seed.official_url),
  access = COALESCE(NULLIF(venue.access, ''), seed.access),
  notes = COALESCE(NULLIF(venue.notes, ''), seed.notes)
FROM orbit_seed_pre_2026_venues seed
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
FROM orbit_seed_pre_2026_venues seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_venues existing
  WHERE existing.name = seed.name
);

INSERT INTO orbit_seed_pre_2026_lives (
  name,
  live_type,
  performer_group_names,
  description
)
VALUES
  (
    'YUUKI YODA GRADUATION CONCERT',
    'single',
    ARRAY['乃木坂46'],
    '与田祐希の卒業コンサート。'
  ),
  (
    '乃木坂46 13th YEAR BIRTHDAY LIVE',
    'single',
    ARRAY['乃木坂46'],
    '乃木坂46の13周年記念ライブ。'
  ),
  (
    '乃木坂46 真夏の全国ツアー2025',
    'tour',
    ARRAY['乃木坂46'],
    '北海道・静岡・大阪・宮城・福岡・香川・東京を回った全国ツアー。'
  ),
  (
    '乃木坂46 真夏の全国ツアー2024',
    'tour',
    ARRAY['乃木坂46'],
    '大阪・愛知・東京を回った5年ぶりのドームツアー。'
  ),
  (
    '乃木坂46 11th YEAR BIRTHDAY LIVE',
    'single',
    ARRAY['乃木坂46'],
    '横浜アリーナで開催された乃木坂46の11周年記念ライブ。'
  ),
  (
    '櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-',
    'tour',
    ARRAY['櫻坂46'],
    '福岡・大阪・愛知・神奈川・東京を回ったアリーナツアー。東京ドーム追加公演を含む。'
  ),
  (
    '櫻坂46 3rd TOUR 2023',
    'tour',
    ARRAY['櫻坂46'],
    '東京・愛知・福岡・神奈川・大阪を回った全国ツアー。'
  ),
  (
    '8th Single BACKS LIVE!!',
    'single',
    ARRAY['櫻坂46'],
    '櫻坂46 8thシングル BACKS MEMBER によるライブ。'
  ),
  (
    '9th Single BACKS LIVE!!',
    'single',
    ARRAY['櫻坂46'],
    '櫻坂46 9thシングル BACKS MEMBER によるライブ。'
  ),
  (
    '櫻坂46 三期生ライブ',
    'single',
    ARRAY['櫻坂46'],
    '櫻坂46 三期生によるライブ。'
  ),
  (
    '10th Single BACKS LIVE!!',
    'single',
    ARRAY['櫻坂46'],
    '櫻坂46 10thシングル BACKS MEMBER によるライブ。12/4公演は齋藤冬優花 卒業セレモニーを実施。'
  ),
  (
    '11th Single BACKS LIVE!!',
    'single',
    ARRAY['櫻坂46'],
    '櫻坂46 11thシングル BACKS MEMBER によるライブ。'
  ),
  (
    '櫻坂46 5th TOUR 2025 "Addiction"',
    'tour',
    ARRAY['櫻坂46'],
    '愛知・福岡・広島・東京・大阪を回った全国ツアー。'
  ),
  (
    '12th Single BACKS LIVE!!',
    'single',
    ARRAY['櫻坂46'],
    '櫻坂46 12thシングル BACKS MEMBER によるライブ。'
  ),
  (
    '櫻坂46 4th YEAR ANNIVERSARY LIVE',
    'single',
    ARRAY['櫻坂46'],
    '櫻坂46の4周年記念ライブ。'
  ),
  (
    '6回目のひな誕祭',
    'single',
    ARRAY['日向坂46'],
    '日向坂46のデビュー6周年記念ライブ。4/5は佐々木美玲 卒業セレモニー、4/6は佐々木久美 卒業セレモニーを実施。'
  ),
  (
    '日向坂46 BRAND NEW LIVE 2025 "OVER THE RAINBOW"',
    'single',
    ARRAY['日向坂46'],
    '五期生加入後の新体制による国立代々木競技場第一体育館公演。'
  ),
  (
    '日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"',
    'tour',
    ARRAY['日向坂46'],
    '宮城・広島・福岡・愛知・大阪・東京を回った全国ツアー。11/19東京公演は河田陽菜 卒業セレモニーを実施。'
  ),
  (
    '5回目のひな誕祭',
    'single',
    ARRAY['日向坂46'],
    '日向坂46のデビュー5周年記念ライブ。'
  ),
  (
    '日向坂46 四期生ライブ',
    'single',
    ARRAY['日向坂46'],
    '日向坂46 四期生による日本武道館公演。'
  ),
  (
    'ひなたフェス2024',
    'festival',
    ARRAY['日向坂46'],
    '宮崎で開催された日向坂46のフェス。'
  ),
  (
    '12th Single ひなた坂46 LIVE',
    'single',
    ARRAY['日向坂46'],
    '日向坂46 12thシングルのひなた坂46メンバーによるライブ。'
  ),
  (
    '日向坂46 Happy Magical Tour 2024',
    'tour',
    ARRAY['日向坂46'],
    '兵庫・福岡・愛知・東京を回った全国ツアー。12/25東京公演は加藤史帆 卒業セレモニーを、12/5福岡公演は濱岸ひより 卒業セレモニーを実施。'
  ),
  (
    '日向坂46 Happy Train Tour 2023',
    'tour',
    ARRAY['日向坂46'],
    '大阪・神奈川・愛知・宮城・福岡・神奈川を回った全国ツアー。Kアリーナ横浜追加公演を含む。'
  );

UPDATE public.orbit_lives AS live
SET
  live_type = seed.live_type,
  description = seed.description
FROM orbit_seed_pre_2026_lives seed
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
FROM orbit_seed_pre_2026_lives seed
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
FROM orbit_seed_pre_2026_lives seed
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

INSERT INTO orbit_seed_pre_2026_performances (
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
  ('YUUKI YODA GRADUATION CONCERT', 'みずほPayPayドーム福岡', '2025-02-22', NULL, NULL, false, false, NULL, 0),
  ('YUUKI YODA GRADUATION CONCERT', 'みずほPayPayドーム福岡', '2025-02-23', NULL, NULL, false, false, NULL, 1),

  ('乃木坂46 13th YEAR BIRTHDAY LIVE', '味の素スタジアム', '2025-05-17', '15:00', '17:30', true, false, NULL, 0),
  ('乃木坂46 13th YEAR BIRTHDAY LIVE', '味の素スタジアム', '2025-05-18', '15:00', '17:30', true, false, NULL, 1),

  ('乃木坂46 真夏の全国ツアー2024', '京セラドーム大阪', '2024-07-20', '15:30', '18:00', false, false, NULL, 0),
  ('乃木坂46 真夏の全国ツアー2024', '京セラドーム大阪', '2024-07-21', '14:30', '17:00', false, false, NULL, 1),
  ('乃木坂46 真夏の全国ツアー2024', 'バンテリンドーム ナゴヤ', '2024-08-24', '15:30', '18:00', false, false, NULL, 2),
  ('乃木坂46 真夏の全国ツアー2024', 'バンテリンドーム ナゴヤ', '2024-08-25', '14:30', '17:00', false, false, NULL, 3),
  ('乃木坂46 真夏の全国ツアー2024', '明治神宮野球場', '2024-09-02', '15:30', '18:00', true, false, NULL, 4),
  ('乃木坂46 真夏の全国ツアー2024', '明治神宮野球場', '2024-09-03', '15:30', '18:00', true, false, NULL, 5),
  ('乃木坂46 真夏の全国ツアー2024', '明治神宮野球場', '2024-09-04', '15:30', '18:00', true, false, NULL, 6),

  ('乃木坂46 11th YEAR BIRTHDAY LIVE', '横浜アリーナ', '2023-02-22', NULL, '18:00', true, false, NULL, 0),
  ('乃木坂46 11th YEAR BIRTHDAY LIVE', '横浜アリーナ', '2023-02-23', NULL, '18:00', true, false, NULL, 1),
  ('乃木坂46 11th YEAR BIRTHDAY LIVE', '横浜アリーナ', '2023-02-24', NULL, '18:00', true, false, NULL, 2),
  ('乃木坂46 11th YEAR BIRTHDAY LIVE', '横浜アリーナ', '2023-02-25', NULL, '18:00', true, false, NULL, 3),
  ('乃木坂46 11th YEAR BIRTHDAY LIVE', '横浜アリーナ', '2023-02-26', NULL, '18:00', true, false, NULL, 4),

  ('乃木坂46 真夏の全国ツアー2025', '真駒内セキスイハイムアイスアリーナ', '2025-07-05', '16:00', '17:30', false, false, NULL, 0),
  ('乃木坂46 真夏の全国ツアー2025', '真駒内セキスイハイムアイスアリーナ', '2025-07-06', '15:00', '16:30', false, false, NULL, 1),
  ('乃木坂46 真夏の全国ツアー2025', 'エコパアリーナ', '2025-07-12', '16:00', '17:30', false, false, NULL, 2),
  ('乃木坂46 真夏の全国ツアー2025', 'エコパアリーナ', '2025-07-13', '15:00', '16:30', false, false, NULL, 3),
  ('乃木坂46 真夏の全国ツアー2025', '大阪城ホール', '2025-07-16', '16:30', '18:00', false, false, NULL, 4),
  ('乃木坂46 真夏の全国ツアー2025', '大阪城ホール', '2025-07-17', '16:30', '18:00', false, false, NULL, 5),
  ('乃木坂46 真夏の全国ツアー2025', 'セキスイハイムスーパーアリーナ', '2025-08-02', '16:00', '17:30', false, false, NULL, 6),
  ('乃木坂46 真夏の全国ツアー2025', 'セキスイハイムスーパーアリーナ', '2025-08-03', '15:00', '16:30', false, false, NULL, 7),
  ('乃木坂46 真夏の全国ツアー2025', 'マリンメッセ福岡Ａ館', '2025-08-09', '16:00', '17:30', false, false, NULL, 8),
  ('乃木坂46 真夏の全国ツアー2025', 'マリンメッセ福岡Ａ館', '2025-08-10', '15:00', '16:30', false, false, NULL, 9),
  ('乃木坂46 真夏の全国ツアー2025', 'あなぶきアリーナ香川', '2025-08-16', '16:00', '17:30', false, false, NULL, 10),
  ('乃木坂46 真夏の全国ツアー2025', 'あなぶきアリーナ香川', '2025-08-17', '15:00', '16:30', false, false, NULL, 11),
  ('乃木坂46 真夏の全国ツアー2025', '明治神宮野球場', '2025-09-04', '15:30', '18:00', true, false, NULL, 12),
  ('乃木坂46 真夏の全国ツアー2025', '明治神宮野球場', '2025-09-05', '15:30', '18:00', true, false, NULL, 13),
  ('乃木坂46 真夏の全国ツアー2025', '明治神宮野球場', '2025-09-06', '15:30', '18:00', true, false, NULL, 14),
  ('乃木坂46 真夏の全国ツアー2025', '明治神宮野球場', '2025-09-07', '15:30', '18:00', true, false, NULL, 15),

  ('櫻坂46 3rd TOUR 2023', '国立代々木競技場第一体育館', '2023-04-12', '16:30', '18:00', false, false, NULL, 0),
  ('櫻坂46 3rd TOUR 2023', '国立代々木競技場第一体育館', '2023-04-13', '16:30', '18:00', false, false, NULL, 1),
  ('櫻坂46 3rd TOUR 2023', '日本ガイシホール', '2023-04-19', '16:30', '18:00', false, false, NULL, 2),
  ('櫻坂46 3rd TOUR 2023', '日本ガイシホール', '2023-04-20', '16:30', '18:00', false, false, NULL, 3),
  ('櫻坂46 3rd TOUR 2023', '福岡国際センター', '2023-04-29', '16:00', '17:30', false, false, NULL, 4),
  ('櫻坂46 3rd TOUR 2023', '福岡国際センター', '2023-04-30', '16:00', '17:30', false, false, NULL, 5),
  ('櫻坂46 3rd TOUR 2023', 'ぴあアリーナMM', '2023-05-23', '16:30', '18:00', false, false, NULL, 6),
  ('櫻坂46 3rd TOUR 2023', 'ぴあアリーナMM', '2023-05-24', '16:30', '18:00', false, false, NULL, 7),
  ('櫻坂46 3rd TOUR 2023', 'ぴあアリーナMM', '2023-05-25', '16:30', '18:00', false, false, NULL, 8),
  ('櫻坂46 3rd TOUR 2023', '大阪城ホール', '2023-05-31', '16:30', '18:00', false, false, NULL, 9),
  ('櫻坂46 3rd TOUR 2023', '大阪城ホール', '2023-06-01', '16:30', '18:00', false, false, NULL, 10),

  ('櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-', 'マリンメッセ福岡Ａ館', '2024-03-02', '16:00', '17:30', false, false, NULL, 0),
  ('櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-', 'マリンメッセ福岡Ａ館', '2024-03-03', '16:00', '17:30', false, false, NULL, 1),
  ('櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-', '大阪城ホール', '2024-03-12', '16:30', '18:00', false, false, NULL, 2),
  ('櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-', '大阪城ホール', '2024-03-13', '16:30', '18:00', false, false, NULL, 3),
  ('櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-', '日本ガイシホール', '2024-03-19', '16:30', '18:00', false, false, NULL, 4),
  ('櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-', '日本ガイシホール', '2024-03-20', '16:00', '17:30', false, false, NULL, 5),
  ('櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-', 'ぴあアリーナMM', '2024-03-26', '16:30', '18:00', false, false, NULL, 6),
  ('櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-', 'ぴあアリーナMM', '2024-03-27', '16:30', '18:00', false, false, NULL, 7),
  ('櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-', '東京ドーム', '2024-06-15', '15:30', '18:00', false, false, NULL, 8),
  ('櫻坂46 4th ARENA TOUR 2024 新・櫻前線 -Go on back?-', '東京ドーム', '2024-06-16', '15:30', '18:00', true, false, NULL, 9),

  ('8th Single BACKS LIVE!!', '幕張イベントホール', '2024-05-09', '17:00', '18:30', true, false, NULL, 0),
  ('8th Single BACKS LIVE!!', '幕張イベントホール', '2024-05-10', '17:00', '18:30', true, false, NULL, 1),

  ('9th Single BACKS LIVE!!', '幕張イベントホール', '2024-08-23', '17:00', '18:30', false, false, NULL, 0),
  ('9th Single BACKS LIVE!!', '幕張イベントホール', '2024-08-24', '16:30', '18:00', false, false, NULL, 1),
  ('9th Single BACKS LIVE!!', '幕張イベントホール', '2024-08-25', '16:30', '18:00', true, false, NULL, 2),

  ('櫻坂46 三期生ライブ', '国立代々木競技場第一体育館', '2024-09-12', '17:00', '18:30', false, false, NULL, 0),
  ('櫻坂46 三期生ライブ', '国立代々木競技場第一体育館', '2024-09-13', '17:00', '18:30', false, false, NULL, 1),
  ('櫻坂46 三期生ライブ', '大阪城ホール', '2024-10-08', '17:00', '18:30', false, false, NULL, 2),
  ('櫻坂46 三期生ライブ', '大阪城ホール', '2024-10-09', '17:00', '18:30', true, false, NULL, 3),

  ('10th Single BACKS LIVE!!', '幕張イベントホール', '2024-12-03', '17:00', '18:30', true, false, NULL, 0),
  ('10th Single BACKS LIVE!!', '幕張イベントホール', '2024-12-04', '17:00', '18:30', true, false, NULL, 1),
  ('10th Single BACKS LIVE!!', '幕張イベントホール', '2024-12-05', '17:00', '18:30', false, false, NULL, 2),

  ('11th Single BACKS LIVE!!', '武蔵野の森総合スポーツプラザ', '2025-03-06', '17:00', '18:30', false, false, NULL, 0),
  ('11th Single BACKS LIVE!!', '武蔵野の森総合スポーツプラザ', '2025-03-07', '17:00', '18:30', true, false, NULL, 1),

  ('櫻坂46 5th TOUR 2025 "Addiction"', 'ポートメッセなごや 第1展示館', '2025-04-26', '16:00', '17:30', false, false, NULL, 0),
  ('櫻坂46 5th TOUR 2025 "Addiction"', 'ポートメッセなごや 第1展示館', '2025-04-27', '16:00', '17:30', false, false, NULL, 1),
  ('櫻坂46 5th TOUR 2025 "Addiction"', 'マリンメッセ福岡Ａ館', '2025-05-02', '17:00', '18:30', false, false, NULL, 2),
  ('櫻坂46 5th TOUR 2025 "Addiction"', 'マリンメッセ福岡Ａ館', '2025-05-03', '16:00', '17:30', false, false, NULL, 3),
  ('櫻坂46 5th TOUR 2025 "Addiction"', '広島グリーンアリーナ', '2025-05-17', '16:00', '17:30', false, false, NULL, 4),
  ('櫻坂46 5th TOUR 2025 "Addiction"', '広島グリーンアリーナ', '2025-05-18', '16:00', '17:30', false, false, NULL, 5),
  ('櫻坂46 5th TOUR 2025 "Addiction"', '東京ドーム', '2025-07-24', '16:00', '18:30', false, false, NULL, 6),
  ('櫻坂46 5th TOUR 2025 "Addiction"', '東京ドーム', '2025-07-25', '16:00', '18:30', false, false, NULL, 7),
  ('櫻坂46 5th TOUR 2025 "Addiction"', '東京ドーム', '2025-07-26', '14:30', '17:00', false, false, NULL, 8),
  ('櫻坂46 5th TOUR 2025 "Addiction"', '京セラドーム大阪', '2025-08-23', '14:30', '17:00', false, false, NULL, 9),
  ('櫻坂46 5th TOUR 2025 "Addiction"', '京セラドーム大阪', '2025-08-24', '14:30', '17:00', true, false, NULL, 10),

  ('12th Single BACKS LIVE!!', '幕張イベントホール', '2025-07-09', '17:00', '18:30', false, false, NULL, 0),
  ('12th Single BACKS LIVE!!', '幕張イベントホール', '2025-07-10', '17:00', '18:30', true, false, NULL, 1),

  ('櫻坂46 4th YEAR ANNIVERSARY LIVE', 'ZOZOマリンスタジアム', '2024-11-23', '15:30', '17:30', true, false, NULL, 0),
  ('櫻坂46 4th YEAR ANNIVERSARY LIVE', 'ZOZOマリンスタジアム', '2024-11-24', '15:00', '17:00', true, false, NULL, 1),

  ('5回目のひな誕祭', '横浜スタジアム', '2024-04-06', '15:30', '17:30', true, false, NULL, 0),
  ('5回目のひな誕祭', '横浜スタジアム', '2024-04-07', '15:30', '17:30', true, false, NULL, 1),

  ('6回目のひな誕祭', '横浜スタジアム', '2025-04-05', '14:00', '16:00', false, false, NULL, 0),
  ('6回目のひな誕祭', '横浜スタジアム', '2025-04-06', '14:00', '16:00', false, false, NULL, 1),

  ('日向坂46 四期生ライブ', '日本武道館', '2024-08-27', '17:00', '18:30', true, false, NULL, 0),
  ('日向坂46 四期生ライブ', '日本武道館', '2024-08-28', '17:00', '18:30', true, false, NULL, 1),
  ('日向坂46 四期生ライブ', '日本武道館', '2024-08-29', '17:00', '18:30', true, false, NULL, 2),

  ('ひなたフェス2024', 'ひなたサンマリンスタジアム宮崎', '2024-09-07', '15:00', '17:00', false, false, NULL, 0),
  ('ひなたフェス2024', 'ひなたサンマリンスタジアム宮崎', '2024-09-08', '15:00', '17:00', false, false, NULL, 1),

  ('12th Single ひなた坂46 LIVE', '横浜アリーナ', '2024-10-23', '17:00', '18:30', true, false, NULL, 0),
  ('12th Single ひなた坂46 LIVE', '横浜アリーナ', '2024-10-24', '17:00', '18:30', true, false, NULL, 1),

  ('日向坂46 Happy Magical Tour 2024', '神戸ワールド記念ホール', '2024-11-19', '16:30', '18:00', false, false, NULL, 0),
  ('日向坂46 Happy Magical Tour 2024', '神戸ワールド記念ホール', '2024-11-20', '16:30', '18:00', false, false, NULL, 1),
  ('日向坂46 Happy Magical Tour 2024', 'マリンメッセ福岡Ａ館', '2024-12-04', '16:30', '18:00', false, false, NULL, 2),
  ('日向坂46 Happy Magical Tour 2024', 'マリンメッセ福岡Ａ館', '2024-12-05', '16:30', '18:00', false, false, NULL, 3),
  ('日向坂46 Happy Magical Tour 2024', 'ポートメッセなごや 第1展示館', '2024-12-10', '16:30', '18:00', false, false, NULL, 4),
  ('日向坂46 Happy Magical Tour 2024', 'ポートメッセなごや 第1展示館', '2024-12-11', '16:30', '18:00', false, false, NULL, 5),
  ('日向坂46 Happy Magical Tour 2024', '東京ドーム', '2024-12-25', '15:30', '18:00', true, false, NULL, 6),
  ('日向坂46 Happy Magical Tour 2024', '東京ドーム', '2024-12-26', '15:30', '18:00', true, false, NULL, 7),

  ('日向坂46 Happy Train Tour 2023', '大阪城ホール', '2023-08-30', '16:30', '18:00', false, false, NULL, 0),
  ('日向坂46 Happy Train Tour 2023', '大阪城ホール', '2023-08-31', '16:30', '18:00', false, false, NULL, 1),
  ('日向坂46 Happy Train Tour 2023', '横浜アリーナ', '2023-09-12', '16:30', '18:00', false, false, NULL, 2),
  ('日向坂46 Happy Train Tour 2023', '横浜アリーナ', '2023-09-13', '16:30', '18:00', false, false, NULL, 3),
  ('日向坂46 Happy Train Tour 2023', '日本ガイシホール', '2023-09-23', '16:00', '17:30', false, false, NULL, 4),
  ('日向坂46 Happy Train Tour 2023', '日本ガイシホール', '2023-09-24', '16:00', '17:30', false, false, NULL, 5),
  ('日向坂46 Happy Train Tour 2023', 'セキスイハイムスーパーアリーナ', '2023-10-06', '16:30', '18:00', false, false, NULL, 6),
  ('日向坂46 Happy Train Tour 2023', 'セキスイハイムスーパーアリーナ', '2023-10-07', '16:00', '17:30', false, false, NULL, 7),
  ('日向坂46 Happy Train Tour 2023', 'マリンメッセ福岡Ａ館', '2023-10-14', '16:00', '17:30', false, false, NULL, 8),
  ('日向坂46 Happy Train Tour 2023', 'マリンメッセ福岡Ａ館', '2023-10-15', '16:00', '17:30', false, false, NULL, 9),
  ('日向坂46 Happy Train Tour 2023', 'Kアリーナ横浜', '2023-12-09', '15:30', '17:30', false, false, NULL, 10),
  ('日向坂46 Happy Train Tour 2023', 'Kアリーナ横浜', '2023-12-10', '15:30', '17:30', false, false, NULL, 11),

  ('日向坂46 BRAND NEW LIVE 2025 "OVER THE RAINBOW"', '国立代々木競技場第一体育館', '2025-05-28', '17:00', '18:30', false, false, NULL, 0),
  ('日向坂46 BRAND NEW LIVE 2025 "OVER THE RAINBOW"', '国立代々木競技場第一体育館', '2025-05-29', '17:00', '18:30', false, false, NULL, 1),

  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', 'セキスイハイムスーパーアリーナ', '2025-09-20', '16:00', '17:30', false, false, NULL, 0),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', 'セキスイハイムスーパーアリーナ', '2025-09-21', '16:00', '17:30', false, false, NULL, 1),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', '広島サンプラザホール', '2025-09-27', '16:00', '17:30', false, false, NULL, 2),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', '広島サンプラザホール', '2025-09-28', '16:00', '17:30', false, false, NULL, 3),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', 'マリンメッセ福岡Ａ館', '2025-10-01', '16:30', '18:00', false, false, NULL, 4),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', 'マリンメッセ福岡Ａ館', '2025-10-02', '16:30', '18:00', false, false, NULL, 5),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', 'ポートメッセなごや 第1展示館', '2025-10-13', '16:00', '17:30', false, false, NULL, 6),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', 'ポートメッセなごや 第1展示館', '2025-10-14', '16:30', '18:00', false, false, NULL, 7),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', '大阪城ホール', '2025-10-22', '16:30', '18:00', false, false, NULL, 8),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', '大阪城ホール', '2025-10-23', '16:30', '18:00', false, false, NULL, 9),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', '国立代々木競技場第一体育館', '2025-11-19', '16:30', '18:00', true, false, NULL, 10),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', '国立代々木競技場第一体育館', '2025-11-20', '16:30', '18:00', true, false, NULL, 11),
  ('日向坂46 ARENA TOUR 2025 "MONSTER GROOVE"', '国立代々木競技場第一体育館', '2025-11-21', '16:30', '18:00', true, false, NULL, 12);

UPDATE public.orbit_live_performances AS performance
SET
  doors_open_at = NULLIF(seed.doors_open_at, ''),
  starts_at = NULLIF(seed.starts_at, ''),
  has_streaming = seed.has_streaming,
  has_live_viewing = seed.has_live_viewing,
  seat_info = COALESCE(NULLIF(performance.seat_info, ''), NULLIF(seed.seat_info, '')),
  sort_order = seed.sort_order
FROM orbit_seed_pre_2026_performances seed
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
FROM orbit_seed_pre_2026_performances seed
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

DROP TABLE IF EXISTS orbit_seed_pre_2026_performances;
DROP TABLE IF EXISTS orbit_seed_pre_2026_lives;
DROP TABLE IF EXISTS orbit_seed_pre_2026_venues;
END;
$seed$;
