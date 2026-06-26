-- ============================================================
-- Orbit starter seed: Sakamichi live venues
-- ============================================================
-- Scope:
-- - Recent and representative venues used on official live pages for
--   乃木坂46 / 櫻坂46 / 日向坂46.
-- - Venue names use the latest official naming found during curation.
--
-- Notes:
-- - This seed assumes migrations through 035_venue_links_drop_address.sql.
-- - Existing rows are matched by venue name and only empty optional fields are filled.
-- - Capacity is included only for venues where a public facility figure was found.
--
-- Main sources checked:
-- - 乃木坂46 真夏の全国ツアー2025 / 13th YEAR BIRTHDAY LIVE
-- - 櫻坂46 3rd/4th YEAR ANNIVERSARY LIVE, TOUR 2023, 4th ARENA TOUR 2024, 5th ANNIVERSARY LIVE
-- - 日向坂46 ARENA TOUR 2025, 6回目のひな誕祭, Happy Magical Tour 2024,
--   BRAND NEW LIVE 2025「OVER THE RAINBOW」
-- ============================================================

DO $seed$
BEGIN
DROP TABLE IF EXISTS orbit_seed_venues;

CREATE TEMP TABLE orbit_seed_venues (
  name TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  capacity INT,
  map_url TEXT,
  official_url TEXT,
  access TEXT,
  notes TEXT
) ON COMMIT PRESERVE ROWS;

INSERT INTO orbit_seed_venues (
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
    '真駒内セキスイハイムアイスアリーナ',
    '北海道',
    10024,
    'https://www.google.com/maps/search/?api=1&query=真駒内セキスイハイムアイスアリーナ',
    'https://www.makomanai.com/icearena/',
    NULL,
    '参考公演: 乃木坂46 真夏の全国ツアー2025'
  ),
  (
    'エコパアリーナ',
    '静岡県',
    10000,
    'https://www.google.com/maps/search/?api=1&query=エコパアリーナ',
    'https://www.ecopa.jp/facility/arena/',
    NULL,
    '参考公演: 乃木坂46 真夏の全国ツアー2025'
  ),
  (
    '大阪城ホール',
    '大阪府',
    16000,
    'https://www.google.com/maps/search/?api=1&query=大阪城ホール',
    'https://www.osaka-johall.com/',
    NULL,
    '参考公演: 乃木坂46 真夏の全国ツアー2025 / 櫻坂46 TOUR 2023 / 日向坂46 ARENA TOUR 2025'
  ),
  (
    'セキスイハイムスーパーアリーナ',
    '宮城県',
    7063,
    'https://www.google.com/maps/search/?api=1&query=セキスイハイムスーパーアリーナ',
    'https://www.mspf.jp/grande21/index.php?action=sisetu_shoukai_arena',
    NULL,
    '参考公演: 乃木坂46 真夏の全国ツアー2025 / 日向坂46 ARENA TOUR 2025'
  ),
  (
    'マリンメッセ福岡A館',
    '福岡県',
    15000,
    'https://www.google.com/maps/search/?api=1&query=マリンメッセ福岡A館',
    'https://www.marinemesse.or.jp/messe/',
    NULL,
    '参考公演: 乃木坂46 真夏の全国ツアー2025 / 櫻坂46 4th ARENA TOUR 2024 / 日向坂46 ARENA TOUR 2025'
  ),
  (
    'あなぶきアリーナ香川',
    '香川県',
    10000,
    'https://www.google.com/maps/search/?api=1&query=あなぶきアリーナ香川',
    'https://kagawa-arena.com/',
    NULL,
    '参考公演: 乃木坂46 真夏の全国ツアー2025'
  ),
  (
    '明治神宮野球場',
    '東京都',
    31828,
    'https://www.google.com/maps/search/?api=1&query=明治神宮野球場',
    'https://www.jingu-stadium.com/',
    NULL,
    '参考公演: 乃木坂46 真夏の全国ツアー2025'
  ),
  (
    '味の素スタジアム',
    '東京都',
    49970,
    'https://www.google.com/maps/search/?api=1&query=味の素スタジアム',
    'https://www.ajinomotostadium.com/',
    NULL,
    '参考公演: 乃木坂46 13th YEAR BIRTHDAY LIVE'
  ),
  (
    '国立代々木競技場第一体育館',
    '東京都',
    12542,
    'https://www.google.com/maps/search/?api=1&query=国立代々木競技場第一体育館',
    'https://www.jpnsport.go.jp/yoyogi/',
    NULL,
    '参考公演: 櫻坂46 TOUR 2023 / 日向坂46 BRAND NEW LIVE 2025「OVER THE RAINBOW」'
  ),
  (
    '日本ガイシホール',
    '愛知県',
    10000,
    'https://www.google.com/maps/search/?api=1&query=日本ガイシホール',
    'https://www.nespa.or.jp/sports-plaza/hall/',
    NULL,
    '参考公演: 櫻坂46 TOUR 2023 / 櫻坂46 4th ARENA TOUR 2024'
  ),
  (
    '福岡国際センター',
    '福岡県',
    10000,
    'https://www.google.com/maps/search/?api=1&query=福岡国際センター',
    'https://www.marinemesse.or.jp/kokusai/',
    NULL,
    '参考公演: 櫻坂46 TOUR 2023'
  ),
  (
    'ぴあアリーナMM',
    '神奈川県',
    12141,
    'https://www.google.com/maps/search/?api=1&query=ぴあアリーナMM',
    'https://pia-arena-mm.jp/',
    NULL,
    '参考公演: 櫻坂46 TOUR 2023 / 櫻坂46 4th ARENA TOUR 2024 / 日向坂46 加藤史帆卒業セレモニー'
  ),
  (
    '東京ドーム',
    '東京都',
    55000,
    'https://www.google.com/maps/search/?api=1&query=東京ドーム',
    'https://www.tokyo-dome.co.jp/dome/',
    NULL,
    '参考公演: 櫻坂46 4th ARENA TOUR 2024 / 日向坂46 Happy Magical Tour 2024'
  ),
  (
    'MUFGスタジアム（国立競技場）',
    '東京都',
    67750,
    'https://www.google.com/maps/search/?api=1&query=MUFGスタジアム（国立競技場）',
    'https://jns-e.com/',
    NULL,
    '参考公演: 櫻坂46 5th ANNIVERSARY LIVE'
  ),
  (
    '横浜スタジアム',
    '神奈川県',
    34046,
    'https://www.google.com/maps/search/?api=1&query=横浜スタジアム',
    'https://www.yokohama-stadium.co.jp/',
    NULL,
    '参考公演: 日向坂46 6回目のひな誕祭'
  ),
  (
    '広島サンプラザホール',
    '広島県',
    6052,
    'https://www.google.com/maps/search/?api=1&query=広島サンプラザホール',
    'https://www.hiroshima-sunplaza.or.jp/hall/',
    NULL,
    '参考公演: 日向坂46 ARENA TOUR 2025'
  ),
  (
    'ポートメッセなごや 第1展示館',
    '愛知県',
    15000,
    'https://www.google.com/maps/search/?api=1&query=ポートメッセなごや第1展示館',
    'https://portmesse.com/facility/',
    NULL,
    '参考公演: 日向坂46 ARENA TOUR 2025 / 日向坂46 Happy Magical Tour 2024'
  ),
  (
    '横浜アリーナ',
    '神奈川県',
    17000,
    'https://www.google.com/maps/search/?api=1&query=横浜アリーナ',
    'https://www.yokohama-arena.co.jp/',
    NULL,
    '参考公演: 日向坂46 齊藤京子卒業コンサート'
  ),
  (
    '日本武道館',
    '東京都',
    14471,
    'https://www.google.com/maps/search/?api=1&query=日本武道館',
    'https://www.nipponbudokan.or.jp/',
    NULL,
    '参考公演: 日向坂46 四期生ライブ'
  );

UPDATE public.orbit_venues AS venue
SET
  prefecture = COALESCE(NULLIF(venue.prefecture, ''), seed.prefecture),
  capacity = COALESCE(venue.capacity, seed.capacity),
  map_url = COALESCE(NULLIF(venue.map_url, ''), seed.map_url),
  official_url = COALESCE(NULLIF(venue.official_url, ''), seed.official_url),
  access = COALESCE(NULLIF(venue.access, ''), seed.access),
  notes = COALESCE(NULLIF(venue.notes, ''), seed.notes)
FROM orbit_seed_venues seed
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
FROM orbit_seed_venues seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_venues existing
  WHERE existing.name = seed.name
);

DROP TABLE IF EXISTS orbit_seed_venues;
END;
$seed$;
