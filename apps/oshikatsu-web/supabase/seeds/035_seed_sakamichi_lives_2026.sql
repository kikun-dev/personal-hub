-- ============================================================
-- Orbit starter seed: Sakamichi 2026 lives
-- ============================================================
-- Scope:
-- - 2026年に確認できた 乃木坂46 / 櫻坂46 / 日向坂46 の主要ライブ初期データ。
-- - チケット情報・座席情報は保持しない（#262 で ticket_info / seat_info 列を撤去）。
-- - セットリストは、完全かつ信頼できる公開情報を確認できたものだけ後続 seed で追加する。
--
-- Notes:
-- - Existing rows are matched by live name and performance natural keys.
-- - Missing venues found during curation are inserted here to keep this seed self-contained.
-- - 2026-06-26時点で未開催の公演は、公式に公開された日程・会場のみを登録する。
--
-- Main sources checked:
-- - 乃木坂46 14th YEAR BIRTHDAY LIVE
--   https://www.nogizaka46.com/s/n46/page/14th_birthday_live
-- - 乃木坂46 真夏の全国ツアー2026
--   https://www.nogizaka46.com/s/n46/page/summer_tour2026
-- - 櫻坂46 5th YEAR ANNIVERSARY LIVE
--   https://sakurazaka46.com/s/s46/page/5th_anniversary
-- - 櫻坂46 14th Single BACKS LIVE!!
--   https://sakurazaka46.com/s/s46/page/backslive_14th
-- - 櫻坂46 四期生LIVE
--   https://sakurazaka46.com/s/s46/page/4th_generation_live
-- - Sakurazaka46 ARENA TOUR 2026 -What's lonesome?-
--   https://sakurazaka46.com/s/s46/page/nationaltour2026
-- - 日向坂46 16th Single ひなた坂46 LIVE
--   https://www.hinatazaka46.com/s/official/page/16thSG_hiraganalive
-- - 日向坂46 7回目のひな誕祭
--   https://www.hinatazaka46.com/s/official/page/7th-anniversary
-- - LAWSON 50th Anniversary presents Special LIVE
--   https://www.lawson.co.jp/campaign/50th/action/034.html
-- ============================================================

DO $seed$
BEGIN
DROP TABLE IF EXISTS orbit_seed_2026_venues;
DROP TABLE IF EXISTS orbit_seed_2026_lives;
DROP TABLE IF EXISTS orbit_seed_2026_performances;

CREATE TEMP TABLE orbit_seed_2026_venues (
  name TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  capacity INT,
  map_url TEXT,
  official_url TEXT,
  access TEXT,
  notes TEXT
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE orbit_seed_2026_lives (
  name TEXT NOT NULL,
  live_type TEXT NOT NULL,
  performer_group_names TEXT[] NOT NULL,
  description TEXT
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE orbit_seed_2026_performances (
  live_name TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  performance_date DATE NOT NULL,
  doors_open_at TEXT,
  starts_at TEXT,
  has_streaming BOOLEAN NOT NULL DEFAULT false,
  has_live_viewing BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL
) ON COMMIT PRESERVE ROWS;

INSERT INTO orbit_seed_2026_venues (
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
    'サンドーム福井',
    '福井県',
    NULL,
    'https://www.google.com/maps/search/?api=1&query=サンドーム福井',
    NULL,
    NULL,
    '参考公演: 乃木坂46 真夏の全国ツアー2026'
  ),
  (
    'ひなたサンマリンスタジアム宮崎',
    '宮崎県',
    NULL,
    'https://www.google.com/maps/search/?api=1&query=ひなたサンマリンスタジアム宮崎',
    NULL,
    NULL,
    '参考公演: ひなたフェス2026'
  );

UPDATE public.orbit_venues AS venue
SET
  prefecture = COALESCE(NULLIF(venue.prefecture, ''), seed.prefecture),
  capacity = COALESCE(venue.capacity, seed.capacity),
  map_url = COALESCE(NULLIF(venue.map_url, ''), seed.map_url),
  official_url = COALESCE(NULLIF(venue.official_url, ''), seed.official_url),
  access = COALESCE(NULLIF(venue.access, ''), seed.access),
  notes = COALESCE(NULLIF(venue.notes, ''), seed.notes)
FROM orbit_seed_2026_venues seed
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
FROM orbit_seed_2026_venues seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_venues existing
  WHERE existing.name = seed.name
);

INSERT INTO orbit_seed_2026_lives (
  name,
  live_type,
  performer_group_names,
  description
)
VALUES
  (
    'LAWSON 50th Anniversary presents Special LIVE ～ 櫻坂46 / 日向坂46 ～',
    'festival',
    ARRAY['櫻坂46', '日向坂46'],
    'ローソン創業50周年記念の櫻坂46 / 日向坂46 合同ライブ。'
  ),
  (
    '乃木坂46 Coupling Collection 2022-2025',
    'single',
    ARRAY['乃木坂46'],
    '2022〜2025年のカップリング曲を軸にした有明アリーナ公演。'
  ),
  (
    '乃木坂46 5th ALBUM MEMORIAL LIVE「My respect」',
    'single',
    ARRAY['乃木坂46'],
    '5thアルバム「My respect」発売記念ライブ。'
  ),
  (
    '16th Single ひなた坂46 LIVE',
    'single',
    ARRAY['日向坂46'],
    '日向坂46 16thシングルのひなた坂46メンバーによるライブ。'
  ),
  (
    '櫻坂46 5th YEAR ANNIVERSARY LIVE',
    'single',
    ARRAY['櫻坂46'],
    '櫻坂46の5周年記念ライブ。'
  ),
  (
    '7回目のひな誕祭',
    'single',
    ARRAY['日向坂46'],
    '日向坂46のデビュー7周年記念ライブ。'
  ),
  (
    '14th Single BACKS LIVE!!',
    'single',
    ARRAY['櫻坂46'],
    '櫻坂46 14thシングル BACKS MEMBER によるライブ。5/13公演は武元唯衣 卒業セレモニーを実施。'
  ),
  (
    '乃木坂46 14th YEAR BIRTHDAY LIVE',
    'single',
    ARRAY['乃木坂46'],
    'DAY3は梅澤美波 卒業コンサート。'
  ),
  (
    '櫻坂46 四期生LIVE',
    'single',
    ARRAY['櫻坂46'],
    '櫻坂46 四期生によるライブ。'
  ),
  (
    '乃木坂46 真夏の全国ツアー2026',
    'tour',
    ARRAY['乃木坂46'],
    '福井・神奈川・北海道・広島・大阪・宮城・福岡・東京を回る全国ツアー。8/9福岡公演後に吉田綾乃クリスティー 卒業セレモニーを実施予定。'
  ),
  (
    'Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-',
    'tour',
    ARRAY['櫻坂46'],
    '静岡・兵庫・広島・千葉・宮城・香川を回るアリーナツアー。'
  ),
  (
    'ひなたフェス2026',
    'festival',
    ARRAY['日向坂46'],
    '宮崎で開催予定のひなたフェス2026。'
  );

UPDATE public.orbit_lives AS live
SET
  live_type = seed.live_type,
  description = seed.description
FROM orbit_seed_2026_lives seed
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
FROM orbit_seed_2026_lives seed
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
FROM orbit_seed_2026_lives seed
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

INSERT INTO orbit_seed_2026_performances (
  live_name,
  venue_name,
  performance_date,
  doors_open_at,
  starts_at,
  has_streaming,
  has_live_viewing,
  sort_order
)
VALUES
  ('LAWSON 50th Anniversary presents Special LIVE ～ 櫻坂46 / 日向坂46 ～', 'Kアリーナ横浜', '2026-01-25', '15:00', '17:00', false, false, 0),

  ('乃木坂46 Coupling Collection 2022-2025', '有明アリーナ', '2026-02-20', NULL, NULL, false, false, 0),
  ('乃木坂46 Coupling Collection 2022-2025', '有明アリーナ', '2026-02-21', NULL, NULL, false, false, 1),

  ('乃木坂46 5th ALBUM MEMORIAL LIVE「My respect」', '有明アリーナ', '2026-02-22', NULL, NULL, false, false, 0),
  ('乃木坂46 5th ALBUM MEMORIAL LIVE「My respect」', '有明アリーナ', '2026-02-23', NULL, NULL, false, false, 1),

  ('16th Single ひなた坂46 LIVE', 'TOYOTA ARENA TOKYO', '2026-02-17', '17:00', '18:30', false, false, 0),
  ('16th Single ひなた坂46 LIVE', 'TOYOTA ARENA TOKYO', '2026-02-18', '17:00', '18:30', false, false, 1),

  ('櫻坂46 5th YEAR ANNIVERSARY LIVE', 'MUFGスタジアム（国立競技場）', '2026-04-11', '15:00', '17:30', true, false, 0),
  ('櫻坂46 5th YEAR ANNIVERSARY LIVE', 'MUFGスタジアム（国立競技場）', '2026-04-12', '15:00', '17:30', true, false, 1),

  ('7回目のひな誕祭', '横浜スタジアム', '2026-04-04', '15:00', '17:00', false, false, 0),
  ('7回目のひな誕祭', '横浜スタジアム', '2026-04-05', '15:00', '17:00', false, false, 1),

  ('14th Single BACKS LIVE!!', '幕張イベントホール', '2026-05-12', '17:00', '18:30', false, false, 0),
  ('14th Single BACKS LIVE!!', '幕張イベントホール', '2026-05-13', '17:00', '18:30', false, false, 1),

  ('乃木坂46 14th YEAR BIRTHDAY LIVE', '東京ドーム', '2026-05-19', '16:00', '18:30', true, false, 0),
  ('乃木坂46 14th YEAR BIRTHDAY LIVE', '東京ドーム', '2026-05-20', '16:00', '18:30', true, false, 1),
  ('乃木坂46 14th YEAR BIRTHDAY LIVE', '東京ドーム', '2026-05-21', '15:30', '18:00', true, false, 2),

  ('櫻坂46 四期生LIVE', 'LaLa arena TOKYO-BAY', '2026-06-02', '17:30', '19:00', false, false, 0),
  ('櫻坂46 四期生LIVE', 'LaLa arena TOKYO-BAY', '2026-06-03', '17:30', '19:00', false, false, 1),

  ('乃木坂46 真夏の全国ツアー2026', 'サンドーム福井', '2026-06-13', '15:00', '16:30', false, false, 0),
  ('乃木坂46 真夏の全国ツアー2026', 'サンドーム福井', '2026-06-14', '15:00', '16:30', false, false, 1),
  ('乃木坂46 真夏の全国ツアー2026', '横浜アリーナ', '2026-06-24', '17:00', '18:30', false, false, 2),
  ('乃木坂46 真夏の全国ツアー2026', '横浜アリーナ', '2026-06-25', '17:00', '18:30', false, false, 3),
  ('乃木坂46 真夏の全国ツアー2026', '真駒内セキスイハイムアイスアリーナ', '2026-07-04', '16:00', '17:30', false, false, 4),
  ('乃木坂46 真夏の全国ツアー2026', '真駒内セキスイハイムアイスアリーナ', '2026-07-05', '15:00', '16:30', false, false, 5),
  ('乃木坂46 真夏の全国ツアー2026', '広島グリーンアリーナ', '2026-07-11', '16:00', '17:30', false, false, 6),
  ('乃木坂46 真夏の全国ツアー2026', '広島グリーンアリーナ', '2026-07-12', '15:00', '16:30', false, false, 7),
  ('乃木坂46 真夏の全国ツアー2026', '大阪城ホール', '2026-07-15', '16:30', '18:00', false, false, 8),
  ('乃木坂46 真夏の全国ツアー2026', '大阪城ホール', '2026-07-16', '16:30', '18:00', false, false, 9),
  ('乃木坂46 真夏の全国ツアー2026', 'セキスイハイムスーパーアリーナ', '2026-07-25', '16:00', '17:30', false, false, 10),
  ('乃木坂46 真夏の全国ツアー2026', 'セキスイハイムスーパーアリーナ', '2026-07-26', '15:00', '16:30', false, false, 11),
  ('乃木坂46 真夏の全国ツアー2026', 'マリンメッセ福岡Ａ館', '2026-08-08', '16:00', '17:30', false, false, 12),
  ('乃木坂46 真夏の全国ツアー2026', 'マリンメッセ福岡Ａ館', '2026-08-09', '15:00', '16:30', false, false, 13),
  ('乃木坂46 真夏の全国ツアー2026', '明治神宮野球場', '2026-08-20', '15:30', '18:00', false, false, 14),
  ('乃木坂46 真夏の全国ツアー2026', '明治神宮野球場', '2026-08-21', '15:30', '18:00', false, false, 15),
  ('乃木坂46 真夏の全国ツアー2026', '明治神宮野球場', '2026-08-22', '15:30', '18:00', false, false, 16),
  ('乃木坂46 真夏の全国ツアー2026', '明治神宮野球場', '2026-08-23', '15:30', '18:00', false, false, 17),

  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', 'エコパアリーナ', '2026-07-23', '17:00', '18:30', false, false, 0),
  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', 'エコパアリーナ', '2026-07-24', '17:00', '18:30', false, false, 1),
  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', '神戸ワールド記念ホール', '2026-07-28', '17:00', '18:30', false, false, 2),
  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', '神戸ワールド記念ホール', '2026-07-29', '17:00', '18:30', false, false, 3),
  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', '広島グリーンアリーナ', '2026-08-08', '16:00', '17:30', false, false, 4),
  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', '広島グリーンアリーナ', '2026-08-09', '16:00', '17:30', false, false, 5),
  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', 'LaLa arena TOKYO-BAY', '2026-08-15', '16:00', '17:30', false, false, 6),
  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', 'LaLa arena TOKYO-BAY', '2026-08-16', '16:00', '17:30', false, false, 7),
  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', 'セキスイハイムスーパーアリーナ', '2026-08-22', '16:00', '17:30', false, false, 8),
  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', 'セキスイハイムスーパーアリーナ', '2026-08-23', '16:00', '17:30', false, false, 9),
  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', 'あなぶきアリーナ香川', '2026-08-29', '16:00', '17:30', false, false, 10),
  ('Sakurazaka46 ARENA TOUR 2026 -What''s lonesome?-', 'あなぶきアリーナ香川', '2026-08-30', '16:00', '17:30', false, false, 11),

  ('ひなたフェス2026', 'ひなたサンマリンスタジアム宮崎', '2026-09-05', NULL, NULL, false, false, 0),
  ('ひなたフェス2026', 'ひなたサンマリンスタジアム宮崎', '2026-09-06', NULL, NULL, false, false, 1);

UPDATE public.orbit_live_performances AS performance
SET
  doors_open_at = NULLIF(seed.doors_open_at, ''),
  starts_at = NULLIF(seed.starts_at, ''),
  has_streaming = seed.has_streaming,
  has_live_viewing = seed.has_live_viewing,
  sort_order = seed.sort_order
FROM orbit_seed_2026_performances seed
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
  seed.sort_order
FROM orbit_seed_2026_performances seed
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

DROP TABLE IF EXISTS orbit_seed_2026_performances;
DROP TABLE IF EXISTS orbit_seed_2026_lives;
DROP TABLE IF EXISTS orbit_seed_2026_venues;
END;
$seed$;
