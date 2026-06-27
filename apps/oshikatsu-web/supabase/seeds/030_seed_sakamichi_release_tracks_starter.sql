-- ============================================================
-- Orbit starter seed: Sakamichi releases + lead/representative tracks
-- ============================================================
-- Scope:
-- - Major singles and studio albums for 乃木坂46 / 櫻坂46 / 日向坂46 / 欅坂46 / けやき坂46.
-- - One or more lead/representative tracks per release.
-- - Participant rows are approximated from orbit_member_groups by active membership on release_date.
--
-- Notes:
-- - This seed assumes migrations through 026_add_track_group_and_v2_track_rpcs.sql are applied.
-- - It is intentionally idempotent by natural keys because the current music tables do not have
--   unique constraints on release or track titles.
-- - Duration, composer, arranger, and MV URL are set only when confidently known.
-- - Coupling/full-edition tracklists should be expanded in a later curated pass.
--
-- Main sources checked:
-- - Nogizaka46 discography, Sakurazaka46/Keyakizaka46 discography, Hinatazaka46 discography
-- - Individual pages/snippets for recent releases such as My Respect, Addiction, Love yourself!,
--   Cliffhanger, The growing up train, and 2026 release list pages.
-- ============================================================

DO $seed$
BEGIN
SET CONSTRAINTS ALL DEFERRED;

DROP TABLE IF EXISTS orbit_seed_music_items;

CREATE TEMP TABLE orbit_seed_music_items (
  release_group_name TEXT NOT NULL,
  release_title TEXT NOT NULL,
  release_type TEXT NOT NULL,
  numbering INT,
  release_date DATE,
  track_group_name TEXT,
  track_title TEXT,
  track_number INT,
  duration_seconds INT,
  lyrics_by TEXT,
  music_by TEXT,
  arrangement_by TEXT,
  mv_url TEXT
) ON COMMIT PRESERVE ROWS;

INSERT INTO orbit_seed_music_items (
  release_group_name,
  release_title,
  release_type,
  numbering,
  release_date,
  track_group_name,
  track_title,
  track_number,
  duration_seconds,
  lyrics_by,
  music_by,
  arrangement_by,
  mv_url
)
VALUES
  -- 乃木坂46 singles
  ('乃木坂46', 'ぐるぐるカーテン', 'single', 1, '2012-02-22', '乃木坂46', 'ぐるぐるカーテン', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'おいでシャンプー', 'single', 2, '2012-05-02', '乃木坂46', 'おいでシャンプー', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '走れ!Bicycle', 'single', 3, '2012-08-22', '乃木坂46', '走れ!Bicycle', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '制服のマネキン', 'single', 4, '2012-12-19', '乃木坂46', '制服のマネキン', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '君の名は希望', 'single', 5, '2013-03-13', '乃木坂46', '君の名は希望', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ガールズルール', 'single', 6, '2013-07-03', '乃木坂46', 'ガールズルール', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'バレッタ', 'single', 7, '2013-11-27', '乃木坂46', 'バレッタ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '気づいたら片想い', 'single', 8, '2014-04-02', '乃木坂46', '気づいたら片想い', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '夏のFree&Easy', 'single', 9, '2014-07-09', '乃木坂46', '夏のFree&Easy', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '何度目の青空か?', 'single', 10, '2014-10-08', '乃木坂46', '何度目の青空か?', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '命は美しい', 'single', 11, '2015-03-18', '乃木坂46', '命は美しい', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '太陽ノック', 'single', 12, '2015-07-22', '乃木坂46', '太陽ノック', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '今、話したい誰かがいる', 'single', 13, '2015-10-28', '乃木坂46', '今、話したい誰かがいる', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ハルジオンが咲く頃', 'single', 14, '2016-03-23', '乃木坂46', 'ハルジオンが咲く頃', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '裸足でSummer', 'single', 15, '2016-07-27', '乃木坂46', '裸足でSummer', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'サヨナラの意味', 'single', 16, '2016-11-09', '乃木坂46', 'サヨナラの意味', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'インフルエンサー', 'single', 17, '2017-03-22', '乃木坂46', 'インフルエンサー', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '逃げ水', 'single', 18, '2017-08-09', '乃木坂46', '逃げ水', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'いつかできるから今日できる', 'single', 19, '2017-10-11', '乃木坂46', 'いつかできるから今日できる', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'シンクロニシティ', 'single', 20, '2018-04-25', '乃木坂46', 'シンクロニシティ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ジコチューで行こう!', 'single', 21, '2018-08-08', '乃木坂46', 'ジコチューで行こう!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '帰り道は遠回りしたくなる', 'single', 22, '2018-11-14', '乃木坂46', '帰り道は遠回りしたくなる', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'Sing Out!', 'single', 23, '2019-05-29', '乃木坂46', 'Sing Out!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '夜明けまで強がらなくてもいい', 'single', 24, '2019-09-04', '乃木坂46', '夜明けまで強がらなくてもいい', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'しあわせの保護色', 'single', 25, '2020-03-25', '乃木坂46', 'しあわせの保護色', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '僕は僕を好きになる', 'single', 26, '2021-01-27', '乃木坂46', '僕は僕を好きになる', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ごめんねFingers crossed', 'single', 27, '2021-06-09', '乃木坂46', 'ごめんねFingers crossed', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '君に叱られた', 'single', 28, '2021-09-22', '乃木坂46', '君に叱られた', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'Actually...', 'single', 29, '2022-03-23', '乃木坂46', 'Actually...', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '好きというのはロックだぜ!', 'single', 30, '2022-08-31', '乃木坂46', '好きというのはロックだぜ!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ここにはないもの', 'single', 31, '2022-12-07', '乃木坂46', 'ここにはないもの', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '人は夢を二度見る', 'single', 32, '2023-03-29', '乃木坂46', '人は夢を二度見る', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'おひとりさま天国', 'single', 33, '2023-08-23', '乃木坂46', 'おひとりさま天国', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'Monopoly', 'single', 34, '2023-12-06', '乃木坂46', 'Monopoly', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'チャンスは平等', 'single', 35, '2024-04-10', '乃木坂46', 'チャンスは平等', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'チートデイ', 'single', 36, '2024-08-21', '乃木坂46', 'チートデイ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '歩道橋', 'single', 37, '2024-12-11', '乃木坂46', '歩道橋', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ネーブルオレンジ', 'single', 38, '2025-03-26', '乃木坂46', 'ネーブルオレンジ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'Same numbers', 'single', 39, '2025-07-30', '乃木坂46', 'Same numbers', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ビリヤニ', 'single', 40, '2025-11-26', '乃木坂46', 'ビリヤニ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '最後に階段を駆け上がったのはいつだ?', 'single', 41, '2026-04-08', '乃木坂46', '最後に階段を駆け上がったのはいつだ?', 1, NULL, '秋元康', '古川貴浩', NULL, NULL),

  -- 乃木坂46 albums
  ('乃木坂46', '透明な色', 'album', 1, '2015-01-07', '乃木坂46', '僕がいる場所', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'それぞれの椅子', 'album', 2, '2016-05-25', '乃木坂46', 'きっかけ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '生まれてから初めて見た夢', 'album', 3, '2017-05-24', '乃木坂46', 'スカイダイビング', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '今が思い出になるまで', 'album', 4, '2019-04-17', '乃木坂46', 'ありがちな恋愛', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'My respect', 'album', 5, '2026-01-14', '乃木坂46', 'My respect', 1, NULL, '秋元康', NULL, NULL, NULL),

  -- 欅坂46 singles/albums
  ('欅坂46', 'サイレントマジョリティー', 'single', 1, '2016-04-06', '欅坂46', 'サイレントマジョリティー', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '世界には愛しかない', 'single', 2, '2016-08-10', '欅坂46', '世界には愛しかない', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '二人セゾン', 'single', 3, '2016-11-30', '欅坂46', '二人セゾン', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '不協和音', 'single', 4, '2017-04-05', '欅坂46', '不協和音', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '風に吹かれても', 'single', 5, '2017-10-25', '欅坂46', '風に吹かれても', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', 'ガラスを割れ!', 'single', 6, '2018-03-07', '欅坂46', 'ガラスを割れ!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', 'アンビバレント', 'single', 7, '2018-08-15', '欅坂46', 'アンビバレント', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '黒い羊', 'single', 8, '2019-02-27', '欅坂46', '黒い羊', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '誰がその鐘を鳴らすのか?', 'digital_single', NULL, '2020-08-21', '欅坂46', '誰がその鐘を鳴らすのか?', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '真っ白なものは汚したくなる', 'album', 1, '2017-07-19', '欅坂46', '月曜日の朝、スカートを切られた', 1, NULL, '秋元康', NULL, NULL, NULL),

  -- 櫻坂46 singles/albums
  ('櫻坂46', 'Nobody''s fault', 'single', 1, '2020-12-09', '櫻坂46', 'Nobody''s fault', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'BAN', 'single', 2, '2021-04-14', '櫻坂46', 'BAN', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '流れ弾', 'single', 3, '2021-10-13', '櫻坂46', '流れ弾', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '五月雨よ', 'single', 4, '2022-04-06', '櫻坂46', '五月雨よ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '桜月', 'single', 5, '2023-02-15', '櫻坂46', '桜月', 1, 282, '秋元康', 'NAZCA', NULL, NULL),
  ('櫻坂46', 'Start over!', 'single', 6, '2023-06-28', '櫻坂46', 'Start over!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '承認欲求', 'single', 7, '2023-10-18', '櫻坂46', '承認欲求', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '何歳の頃に戻りたいのか?', 'single', 8, '2024-02-21', '櫻坂46', '何歳の頃に戻りたいのか?', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '自業自得', 'single', 9, '2024-06-26', '櫻坂46', '自業自得', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'I want tomorrow to come', 'single', 10, '2024-10-23', '櫻坂46', 'I want tomorrow to come', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'UDAGAWA GENERATION', 'single', 11, '2025-02-19', '櫻坂46', 'UDAGAWA GENERATION', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Make or Break', 'single', 12, '2025-06-25', '櫻坂46', 'Make or Break', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Unhappy birthday構文', 'single', 13, '2025-10-29', '櫻坂46', 'Unhappy birthday構文', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'The growing up train', 'single', 14, '2026-03-11', '櫻坂46', 'The growing up train', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Lonesome rabbit/What''s "KAZOKU"?', 'single', 15, '2026-06-10', '櫻坂46', 'Lonesome rabbit', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Lonesome rabbit/What''s "KAZOKU"?', 'single', 15, '2026-06-10', '櫻坂46', 'What''s "KAZOKU"?', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'As you know?', 'album', 1, '2022-08-03', '櫻坂46', '摩擦係数', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Addiction', 'album', 2, '2025-04-30', '櫻坂46', 'Addiction', 1, NULL, '秋元康', NULL, NULL, NULL),

  -- けやき坂46 album and representative songs from 欅坂46 releases
  ('けやき坂46', '走り出す瞬間', 'album', 1, '2018-06-20', 'けやき坂46', '期待していない自分', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '世界には愛しかない', 'single', 2, '2016-08-10', 'けやき坂46', 'ひらがなけやき', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '二人セゾン', 'single', 3, '2016-11-30', 'けやき坂46', '誰よりも高く跳べ!', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '不協和音', 'single', 4, '2017-04-05', 'けやき坂46', '僕たちは付き合っている', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '風に吹かれても', 'single', 5, '2017-10-25', 'けやき坂46', 'それでも歩いてる', 2, NULL, '秋元康', NULL, NULL, NULL),

  -- 日向坂46 singles/albums
  ('日向坂46', 'キュン', 'single', 1, '2019-03-27', '日向坂46', 'キュン', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'ドレミソラシド', 'single', 2, '2019-07-17', '日向坂46', 'ドレミソラシド', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'こんなに好きになっちゃっていいの?', 'single', 3, '2019-10-02', '日向坂46', 'こんなに好きになっちゃっていいの?', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'ソンナコトナイヨ', 'single', 4, '2020-02-19', '日向坂46', 'ソンナコトナイヨ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '君しか勝たん', 'single', 5, '2021-05-26', '日向坂46', '君しか勝たん', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'ってか', 'single', 6, '2021-10-27', '日向坂46', 'ってか', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '僕なんか', 'single', 7, '2022-06-01', '日向坂46', '僕なんか', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '月と星が踊るMidnight', 'single', 8, '2022-10-26', '日向坂46', '月と星が踊るMidnight', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'One choice', 'single', 9, '2023-04-19', '日向坂46', 'One choice', 1, 284, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'Am I ready?', 'single', 10, '2023-07-26', '日向坂46', 'Am I ready?', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '君はハニーデュー', 'single', 11, '2024-05-08', '日向坂46', '君はハニーデュー', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '絶対的第六感', 'single', 12, '2024-09-18', '日向坂46', '絶対的第六感', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '卒業写真だけが知ってる', 'single', 13, '2025-01-29', '日向坂46', '卒業写真だけが知ってる', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'Love yourself!', 'single', 14, '2025-05-21', '日向坂46', 'Love yourself!', 1, 260, '秋元康', '川口進 / 草川瞬 / 佐原康太', NULL, NULL),
  ('日向坂46', 'お願いバッハ!', 'single', 15, '2025-09-17', '日向坂46', 'お願いバッハ!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'クリフハンガー', 'single', 16, '2026-01-28', '日向坂46', 'クリフハンガー', 1, NULL, '秋元康', '杉山勝彦', '杉山勝彦 / 谷地学', NULL),
  ('日向坂46', 'Kind of love', 'single', 17, '2026-05-20', '日向坂46', 'Kind of love', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'ひなたざか', 'album', 1, '2020-09-23', '日向坂46', 'アザトカワイイ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '脈打つ感情', 'album', 2, '2023-11-08', '日向坂46', '君は0から1になれ', 1, NULL, '秋元康', NULL, NULL, NULL);

-- Releases
INSERT INTO public.orbit_releases (
  title,
  group_id,
  release_type,
  numbering,
  release_date
)
SELECT DISTINCT
  seed.release_title,
  release_group.id,
  seed.release_type,
  seed.numbering,
  seed.release_date
FROM orbit_seed_music_items seed
JOIN public.orbit_groups release_group
  ON release_group.name_ja = seed.release_group_name
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_releases existing
  WHERE existing.title = seed.release_title
    AND existing.group_id = release_group.id
    AND existing.release_type = seed.release_type
    AND COALESCE(existing.numbering, -1) = COALESCE(seed.numbering, -1)
);

-- Tracks
INSERT INTO public.orbit_tracks (
  title,
  group_id
)
SELECT DISTINCT
  seed.track_title,
  track_group.id
FROM orbit_seed_music_items seed
JOIN public.orbit_groups track_group
  ON track_group.name_ja = seed.track_group_name
WHERE seed.track_title IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.orbit_tracks existing
    WHERE existing.title = seed.track_title
      AND existing.group_id = track_group.id
  );

-- Release-track links
INSERT INTO public.orbit_release_tracks (
  release_id,
  track_id,
  track_number
)
SELECT
  release.id,
  track.id,
  seed.track_number
FROM orbit_seed_music_items seed
JOIN public.orbit_groups release_group
  ON release_group.name_ja = seed.release_group_name
JOIN public.orbit_releases release
  ON release.title = seed.release_title
  AND release.group_id = release_group.id
  AND release.release_type = seed.release_type
  AND COALESCE(release.numbering, -1) = COALESCE(seed.numbering, -1)
JOIN public.orbit_groups track_group
  ON track_group.name_ja = seed.track_group_name
JOIN public.orbit_tracks track
  ON track.title = seed.track_title
  AND track.group_id = track_group.id
WHERE seed.track_title IS NOT NULL
  AND seed.track_number IS NOT NULL
ON CONFLICT (release_id, track_number) DO NOTHING;

-- People
WITH raw_people AS (
  SELECT lyrics_by AS names FROM orbit_seed_music_items
  UNION ALL
  SELECT music_by AS names FROM orbit_seed_music_items
  UNION ALL
  SELECT arrangement_by AS names FROM orbit_seed_music_items
),
people AS (
  SELECT DISTINCT NULLIF(BTRIM(person_name), '') AS display_name
  FROM raw_people
  CROSS JOIN LATERAL regexp_split_to_table(COALESCE(raw_people.names, ''), '\s*/\s*|、') AS person_name
)
INSERT INTO public.orbit_people (display_name)
SELECT display_name
FROM people
WHERE display_name IS NOT NULL
ON CONFLICT (display_name) DO NOTHING;

-- Credits
WITH credit_source AS (
  SELECT seed.track_title, seed.track_group_name, 'lyrics'::TEXT AS credit_role, seed.lyrics_by AS names
  FROM orbit_seed_music_items seed
  UNION ALL
  SELECT seed.track_title, seed.track_group_name, 'music'::TEXT AS credit_role, seed.music_by AS names
  FROM orbit_seed_music_items seed
  UNION ALL
  SELECT seed.track_title, seed.track_group_name, 'arrangement'::TEXT AS credit_role, seed.arrangement_by AS names
  FROM orbit_seed_music_items seed
),
credit_people AS (
  SELECT
    credit_source.track_title,
    credit_source.track_group_name,
    credit_source.credit_role,
    NULLIF(BTRIM(person_name), '') AS display_name,
    (ordinality - 1)::INT AS sort_order
  FROM credit_source
  CROSS JOIN LATERAL regexp_split_to_table(COALESCE(credit_source.names, ''), '\s*/\s*|、') WITH ORDINALITY AS split(person_name, ordinality)
)
INSERT INTO public.orbit_track_credits (
  track_id,
  credit_role,
  person_id,
  sort_order
)
SELECT DISTINCT
  track.id,
  credit_people.credit_role,
  person.id,
  credit_people.sort_order
FROM credit_people
JOIN public.orbit_groups track_group
  ON track_group.name_ja = credit_people.track_group_name
JOIN public.orbit_tracks track
  ON track.title = credit_people.track_title
  AND track.group_id = track_group.id
JOIN public.orbit_people person
  ON person.display_name = credit_people.display_name
WHERE credit_people.display_name IS NOT NULL
ON CONFLICT (track_id, credit_role, person_id) DO NOTHING;

-- MV links
INSERT INTO public.orbit_track_mvs (
  track_id,
  mv_url
)
SELECT DISTINCT
  track.id,
  seed.mv_url
FROM orbit_seed_music_items seed
JOIN public.orbit_groups track_group
  ON track_group.name_ja = seed.track_group_name
JOIN public.orbit_tracks track
  ON track.title = seed.track_title
  AND track.group_id = track_group.id
WHERE seed.mv_url IS NOT NULL
ON CONFLICT (track_id) DO UPDATE
SET mv_url = EXCLUDED.mv_url;

-- Approximate release participants from member group history.
-- This uses all members who belonged to the release group on release_date.
INSERT INTO public.orbit_release_members (
  release_id,
  member_id
)
SELECT DISTINCT
  release.id,
  member_group.member_id
FROM orbit_seed_music_items seed
JOIN public.orbit_groups release_group
  ON release_group.name_ja = seed.release_group_name
JOIN public.orbit_releases release
  ON release.title = seed.release_title
  AND release.group_id = release_group.id
  AND release.release_type = seed.release_type
  AND COALESCE(release.numbering, -1) = COALESCE(seed.numbering, -1)
JOIN public.orbit_member_groups member_group
  ON member_group.group_id = release_group.id
WHERE seed.release_date IS NOT NULL
  AND (member_group.joined_at IS NULL OR member_group.joined_at <= seed.release_date)
  AND (member_group.graduated_at IS NULL OR member_group.graduated_at >= seed.release_date)
ON CONFLICT (release_id, member_id) DO NOTHING;

DROP TABLE IF EXISTS orbit_seed_music_items;

END;
$seed$;
