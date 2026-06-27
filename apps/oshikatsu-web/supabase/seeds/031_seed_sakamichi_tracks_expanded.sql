-- ============================================================
-- Orbit starter seed: Sakamichi tracks
-- ============================================================
-- Scope:
-- - Lead/representative tracks for releases inserted by
--   030_seed_sakamichi_release_tracks_starter.sql or equivalent release seed.
-- - A small set of important coupling/album lead tracks.
--
-- Notes:
-- - This file does not create releases. It only inserts tracks and release-track links
--   for releases already present in public.orbit_releases.
-- - orbit_tracks has a deferred constraint requiring at least one release link.
--   To avoid orphan tracks, this seed inserts tracks only when the target release exists
--   and the target track_number is not already occupied by a different track.
-- - Durations, composer/arranger, and MV URLs are intentionally sparse.
--   NULL means "not curated yet", not "does not exist".
-- ============================================================

DO $seed$
BEGIN
SET CONSTRAINTS ALL DEFERRED;

DROP TABLE IF EXISTS orbit_seed_resolved_track_items;
DROP TABLE IF EXISTS orbit_seed_track_items;

CREATE TEMP TABLE orbit_seed_track_items (
  release_group_name TEXT NOT NULL,
  release_title TEXT NOT NULL,
  release_type TEXT NOT NULL,
  release_numbering INT,
  track_group_name TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_number INT NOT NULL,
  duration_seconds INT,
  lyrics_by TEXT,
  music_by TEXT,
  arrangement_by TEXT,
  mv_url TEXT
) ON COMMIT PRESERVE ROWS;

INSERT INTO orbit_seed_track_items (
  release_group_name,
  release_title,
  release_type,
  release_numbering,
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
  -- 乃木坂46: singles
  ('乃木坂46', 'ぐるぐるカーテン', 'single', 1, '乃木坂46', 'ぐるぐるカーテン', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ぐるぐるカーテン', 'single', 1, '乃木坂46', '乃木坂の詩', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'おいでシャンプー', 'single', 2, '乃木坂46', 'おいでシャンプー', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '走れ!Bicycle', 'single', 3, '乃木坂46', '走れ!Bicycle', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '制服のマネキン', 'single', 4, '乃木坂46', '制服のマネキン', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '君の名は希望', 'single', 5, '乃木坂46', '君の名は希望', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '君の名は希望', 'single', 5, '乃木坂46', '13日の金曜日', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ガールズルール', 'single', 6, '乃木坂46', 'ガールズルール', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'バレッタ', 'single', 7, '乃木坂46', 'バレッタ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '気づいたら片想い', 'single', 8, '乃木坂46', '気づいたら片想い', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '夏のFree&Easy', 'single', 9, '乃木坂46', '夏のFree&Easy', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '何度目の青空か?', 'single', 10, '乃木坂46', '何度目の青空か?', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '命は美しい', 'single', 11, '乃木坂46', '命は美しい', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '太陽ノック', 'single', 12, '乃木坂46', '太陽ノック', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '今、話したい誰かがいる', 'single', 13, '乃木坂46', '今、話したい誰かがいる', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ハルジオンが咲く頃', 'single', 14, '乃木坂46', 'ハルジオンが咲く頃', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '裸足でSummer', 'single', 15, '乃木坂46', '裸足でSummer', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'サヨナラの意味', 'single', 16, '乃木坂46', 'サヨナラの意味', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'インフルエンサー', 'single', 17, '乃木坂46', 'インフルエンサー', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '逃げ水', 'single', 18, '乃木坂46', '逃げ水', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'いつかできるから今日できる', 'single', 19, '乃木坂46', 'いつかできるから今日できる', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'シンクロニシティ', 'single', 20, '乃木坂46', 'シンクロニシティ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ジコチューで行こう!', 'single', 21, '乃木坂46', 'ジコチューで行こう!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '帰り道は遠回りしたくなる', 'single', 22, '乃木坂46', '帰り道は遠回りしたくなる', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'Sing Out!', 'single', 23, '乃木坂46', 'Sing Out!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '夜明けまで強がらなくてもいい', 'single', 24, '乃木坂46', '夜明けまで強がらなくてもいい', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'しあわせの保護色', 'single', 25, '乃木坂46', 'しあわせの保護色', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '僕は僕を好きになる', 'single', 26, '乃木坂46', '僕は僕を好きになる', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ごめんねFingers crossed', 'single', 27, '乃木坂46', 'ごめんねFingers crossed', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '君に叱られた', 'single', 28, '乃木坂46', '君に叱られた', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'Actually...', 'single', 29, '乃木坂46', 'Actually...', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '好きというのはロックだぜ!', 'single', 30, '乃木坂46', '好きというのはロックだぜ!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ここにはないもの', 'single', 31, '乃木坂46', 'ここにはないもの', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '人は夢を二度見る', 'single', 32, '乃木坂46', '人は夢を二度見る', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'おひとりさま天国', 'single', 33, '乃木坂46', 'おひとりさま天国', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'Monopoly', 'single', 34, '乃木坂46', 'Monopoly', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'チャンスは平等', 'single', 35, '乃木坂46', 'チャンスは平等', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'チートデイ', 'single', 36, '乃木坂46', 'チートデイ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '歩道橋', 'single', 37, '乃木坂46', '歩道橋', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ネーブルオレンジ', 'single', 38, '乃木坂46', 'ネーブルオレンジ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'Same numbers', 'single', 39, '乃木坂46', 'Same numbers', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'ビリヤニ', 'single', 40, '乃木坂46', 'ビリヤニ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '最後に階段を駆け上がったのはいつだ?', 'single', 41, '乃木坂46', '最後に階段を駆け上がったのはいつだ?', 1, NULL, '秋元康', '古川貴浩', NULL, NULL),

  -- 乃木坂46: albums / digital representative songs
  ('乃木坂46', '透明な色', 'album', 1, '乃木坂46', '僕がいる場所', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'それぞれの椅子', 'album', 2, '乃木坂46', 'きっかけ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '生まれてから初めて見た夢', 'album', 3, '乃木坂46', 'スカイダイビング', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', '今が思い出になるまで', 'album', 4, '乃木坂46', 'ありがちな恋愛', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('乃木坂46', 'My respect', 'album', 5, '乃木坂46', 'My respect', 1, NULL, '秋元康', NULL, NULL, NULL),

  -- 欅坂46
  ('欅坂46', 'サイレントマジョリティー', 'single', 1, '欅坂46', 'サイレントマジョリティー', 1, NULL, '秋元康', 'バグベア', NULL, NULL),
  ('欅坂46', 'サイレントマジョリティー', 'single', 1, '欅坂46', '手を繋いで帰ろうか', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '世界には愛しかない', 'single', 2, '欅坂46', '世界には愛しかない', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '世界には愛しかない', 'single', 2, 'けやき坂46', 'ひらがなけやき', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '二人セゾン', 'single', 3, '欅坂46', '二人セゾン', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '二人セゾン', 'single', 3, 'けやき坂46', '誰よりも高く跳べ!', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '不協和音', 'single', 4, '欅坂46', '不協和音', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '不協和音', 'single', 4, 'けやき坂46', '僕たちは付き合っている', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '風に吹かれても', 'single', 5, '欅坂46', '風に吹かれても', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '風に吹かれても', 'single', 5, 'けやき坂46', 'それでも歩いてる', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', 'ガラスを割れ!', 'single', 6, '欅坂46', 'ガラスを割れ!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', 'アンビバレント', 'single', 7, '欅坂46', 'アンビバレント', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '黒い羊', 'single', 8, '欅坂46', '黒い羊', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '誰がその鐘を鳴らすのか?', 'digital_single', NULL, '欅坂46', '誰がその鐘を鳴らすのか?', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '真っ白なものは汚したくなる', 'album', 1, '欅坂46', '月曜日の朝、スカートを切られた', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('欅坂46', '真っ白なものは汚したくなる', 'album', 1, 'けやき坂46', '沈黙した恋人よ', 2, NULL, '秋元康', NULL, NULL, NULL),

  -- けやき坂46
  ('けやき坂46', '走り出す瞬間', 'album', 1, 'けやき坂46', '期待していない自分', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('けやき坂46', '走り出す瞬間', 'album', 1, 'けやき坂46', 'ハッピーオーラ', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('けやき坂46', '走り出す瞬間', 'album', 1, 'けやき坂46', '半分の記憶', 3, NULL, '秋元康', NULL, NULL, NULL),

  -- 櫻坂46
  ('櫻坂46', 'Nobody''s fault', 'single', 1, '櫻坂46', 'Nobody''s fault', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Nobody''s fault', 'single', 1, '櫻坂46', 'なぜ 恋をして来なかったんだろう?', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Nobody''s fault', 'single', 1, '櫻坂46', 'Buddies', 3, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'BAN', 'single', 2, '櫻坂46', 'BAN', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'BAN', 'single', 2, '櫻坂46', '偶然の答え', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '流れ弾', 'single', 3, '櫻坂46', '流れ弾', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '流れ弾', 'single', 3, '櫻坂46', '無言の宇宙', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '五月雨よ', 'single', 4, '櫻坂46', '五月雨よ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '桜月', 'single', 5, '櫻坂46', '桜月', 1, 282, '秋元康', 'NAZCA', NULL, NULL),
  ('櫻坂46', '桜月', 'single', 5, '櫻坂46', '夏の近道', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Start over!', 'single', 6, '櫻坂46', 'Start over!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Start over!', 'single', 6, '櫻坂46', '静寂の暴力', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '承認欲求', 'single', 7, '櫻坂46', '承認欲求', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '何歳の頃に戻りたいのか?', 'single', 8, '櫻坂46', '何歳の頃に戻りたいのか?', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', '自業自得', 'single', 9, '櫻坂46', '自業自得', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'I want tomorrow to come', 'single', 10, '櫻坂46', 'I want tomorrow to come', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'UDAGAWA GENERATION', 'single', 11, '櫻坂46', 'UDAGAWA GENERATION', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Make or Break', 'single', 12, '櫻坂46', 'Make or Break', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Unhappy birthday構文', 'single', 13, '櫻坂46', 'Unhappy birthday構文', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'The growing up train', 'single', 14, '櫻坂46', 'The growing up train', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Lonesome rabbit/What''s "KAZOKU"?', 'single', 15, '櫻坂46', 'Lonesome rabbit', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Lonesome rabbit/What''s "KAZOKU"?', 'single', 15, '櫻坂46', 'What''s "KAZOKU"?', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'As you know?', 'album', 1, '櫻坂46', '摩擦係数', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('櫻坂46', 'Addiction', 'album', 2, '櫻坂46', 'Addiction', 1, NULL, '秋元康', NULL, NULL, NULL),

  -- 日向坂46
  ('日向坂46', 'キュン', 'single', 1, '日向坂46', 'キュン', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'キュン', 'single', 1, '日向坂46', 'JOYFUL LOVE', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'ドレミソラシド', 'single', 2, '日向坂46', 'ドレミソラシド', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'ドレミソラシド', 'single', 2, '日向坂46', 'キツネ', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'こんなに好きになっちゃっていいの?', 'single', 3, '日向坂46', 'こんなに好きになっちゃっていいの?', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'こんなに好きになっちゃっていいの?', 'single', 3, '日向坂46', 'ホントの時間', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'ソンナコトナイヨ', 'single', 4, '日向坂46', 'ソンナコトナイヨ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'ソンナコトナイヨ', 'single', 4, '日向坂46', '青春の馬', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '君しか勝たん', 'single', 5, '日向坂46', '君しか勝たん', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'ってか', 'single', 6, '日向坂46', 'ってか', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '僕なんか', 'single', 7, '日向坂46', '僕なんか', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '僕なんか', 'single', 7, '日向坂46', '飛行機雲ができる理由', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '月と星が踊るMidnight', 'single', 8, '日向坂46', '月と星が踊るMidnight', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '月と星が踊るMidnight', 'single', 8, '日向坂46', 'ブルーベリー&ラズベリー', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'One choice', 'single', 9, '日向坂46', 'One choice', 1, 284, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'One choice', 'single', 9, '日向坂46', '恋は逃げ足が早い', 2, 244, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'Am I ready?', 'single', 10, '日向坂46', 'Am I ready?', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'Am I ready?', 'single', 10, '日向坂46', '見たことない魔物', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '君はハニーデュー', 'single', 11, '日向坂46', '君はハニーデュー', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '絶対的第六感', 'single', 12, '日向坂46', '絶対的第六感', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '卒業写真だけが知ってる', 'single', 13, '日向坂46', '卒業写真だけが知ってる', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'Love yourself!', 'single', 14, '日向坂46', 'Love yourself!', 1, 260, '秋元康', '川口進 / 草川瞬 / 佐原康太', NULL, NULL),
  ('日向坂46', 'Love yourself!', 'single', 14, '日向坂46', 'German Iris', 2, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'お願いバッハ!', 'single', 15, '日向坂46', 'お願いバッハ!', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'クリフハンガー', 'single', 16, '日向坂46', 'クリフハンガー', 1, NULL, '秋元康', '杉山勝彦', '杉山勝彦 / 谷地学', NULL),
  ('日向坂46', 'クリフハンガー', 'single', 16, '日向坂46', '涙目の太陽', 2, NULL, '松田好花', NULL, NULL, NULL),
  ('日向坂46', 'Kind of love', 'single', 17, '日向坂46', 'Kind of love', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', 'ひなたざか', 'album', 1, '日向坂46', 'アザトカワイイ', 1, NULL, '秋元康', NULL, NULL, NULL),
  ('日向坂46', '脈打つ感情', 'album', 2, '日向坂46', '君は0から1になれ', 1, NULL, '秋元康', NULL, NULL, NULL);

CREATE TEMP TABLE orbit_seed_resolved_track_items ON COMMIT PRESERVE ROWS AS
SELECT
  seed.*,
  release.id AS release_id,
  track_group.id AS track_group_id
FROM orbit_seed_track_items seed
JOIN public.orbit_groups release_group
  ON release_group.name_ja = seed.release_group_name
JOIN public.orbit_releases release
  ON release.title = seed.release_title
  AND release.group_id = release_group.id
  AND release.release_type = seed.release_type
  AND release.numbering IS NOT DISTINCT FROM seed.release_numbering
JOIN public.orbit_groups track_group
  ON track_group.name_ja = seed.track_group_name
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_release_tracks existing_release_track
  JOIN public.orbit_tracks existing_track
    ON existing_track.id = existing_release_track.track_id
  WHERE existing_release_track.release_id = release.id
    AND existing_release_track.track_number = seed.track_number
    AND (
      existing_track.title <> seed.track_title
      OR existing_track.group_id <> track_group.id
    )
);

-- Tracks
INSERT INTO public.orbit_tracks (
  title,
  group_id
)
SELECT DISTINCT
  seed.track_title,
  seed.track_group_id
FROM orbit_seed_resolved_track_items seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_tracks existing
  WHERE existing.title = seed.track_title
    AND existing.group_id = seed.track_group_id
);

-- Release-track links
INSERT INTO public.orbit_release_tracks (
  release_id,
  track_id,
  track_number
)
SELECT DISTINCT
  seed.release_id,
  track.id,
  seed.track_number
FROM orbit_seed_resolved_track_items seed
JOIN public.orbit_tracks track
  ON track.title = seed.track_title
  AND track.group_id = seed.track_group_id
ON CONFLICT (release_id, track_id) DO NOTHING;

-- People
WITH raw_people AS (
  SELECT lyrics_by AS names FROM orbit_seed_resolved_track_items
  UNION ALL
  SELECT music_by AS names FROM orbit_seed_resolved_track_items
  UNION ALL
  SELECT arrangement_by AS names FROM orbit_seed_resolved_track_items
),
people AS (
  SELECT DISTINCT NULLIF(BTRIM(person_name), '') AS display_name
  FROM raw_people
  CROSS JOIN LATERAL regexp_split_to_table(COALESCE(raw_people.names, ''), '[[:space:]]*/[[:space:]]*|、') AS person_name
)
INSERT INTO public.orbit_people (display_name)
SELECT display_name
FROM people
WHERE display_name IS NOT NULL
ON CONFLICT (display_name) DO NOTHING;

-- Credits
WITH credit_source AS (
  SELECT track_title, track_group_id, 'lyrics'::TEXT AS credit_role, lyrics_by AS names
  FROM orbit_seed_resolved_track_items
  UNION ALL
  SELECT track_title, track_group_id, 'music'::TEXT AS credit_role, music_by AS names
  FROM orbit_seed_resolved_track_items
  UNION ALL
  SELECT track_title, track_group_id, 'arrangement'::TEXT AS credit_role, arrangement_by AS names
  FROM orbit_seed_resolved_track_items
),
credit_people AS (
  SELECT
    credit_source.track_title,
    credit_source.track_group_id,
    credit_source.credit_role,
    NULLIF(BTRIM(person_name), '') AS display_name,
    (ordinality - 1)::INT AS sort_order
  FROM credit_source
  CROSS JOIN LATERAL regexp_split_to_table(COALESCE(credit_source.names, ''), '[[:space:]]*/[[:space:]]*|、') WITH ORDINALITY AS split(person_name, ordinality)
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
JOIN public.orbit_tracks track
  ON track.title = credit_people.track_title
  AND track.group_id = credit_people.track_group_id
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
FROM orbit_seed_resolved_track_items seed
JOIN public.orbit_tracks track
  ON track.title = seed.track_title
  AND track.group_id = seed.track_group_id
WHERE seed.mv_url IS NOT NULL
ON CONFLICT (track_id) DO UPDATE
SET mv_url = EXCLUDED.mv_url;

DROP TABLE IF EXISTS orbit_seed_resolved_track_items;
DROP TABLE IF EXISTS orbit_seed_track_items;

END;
$seed$;
