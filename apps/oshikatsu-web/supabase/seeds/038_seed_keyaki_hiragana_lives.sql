-- ============================================================
-- Orbit starter seed: Keyakizaka46 / Hiragana Keyakizaka46 lives
-- ============================================================
-- Scope:
-- - 欅坂46 / けやき坂46 の主要ライブ初期データ。
-- - 旧公式サイト・公式特設ページ・公式ディスコグラフィーで確認できる代表公演を登録する。
-- - チケット情報・座席情報は保持しない（#262 で ticket_info / seat_info 列を撤去）。
-- - セットリストは、完全かつ信頼できる公開情報を確認できたものだけ後続 seed で追加する。
--
-- Notes:
-- - Existing rows are matched by live name and performance natural keys.
-- - 旧公式サイトは画像中心のページが多いため、開場/開演が本文で確認しにくい公演は時刻を NULL にする。
--
-- Main sources checked:
-- - 欅坂46 ARENA TOUR 2019 in TOKYO DOME SPECIAL SITE
--   https://www.keyakizaka46.com/s/k46o/page/tokyodome
-- - ひらがなくりすます2018
--   https://www.keyakizaka46.com/s/k46o/page/hiragana_xmas2018
-- - 欅共和国2017 / 2018 / 2019 公式ディスコグラフィー
--   https://www.keyakizaka46.com/s/k46o/discography/SRXL-181
--   https://www.keyakizaka46.com/s/k46o/discography/SRXL-220
--   https://www.keyakizaka46.com/s/k46o/discography/SRXL-270
-- - 欅坂46 LIVE at 東京ドーム 公式ディスコグラフィー
--   https://www.keyakizaka46.com/s/k46o/discography/SRXL-238
-- - 欅坂46 THE LAST LIVE 公式ディスコグラフィー
--   https://www.keyakizaka46.com/s/k46o/discography/SRXL-310
-- ============================================================

DO $seed$
BEGIN
DROP TABLE IF EXISTS orbit_seed_keyaki_venues;
DROP TABLE IF EXISTS orbit_seed_keyaki_lives;
DROP TABLE IF EXISTS orbit_seed_keyaki_performances;

CREATE TEMP TABLE orbit_seed_keyaki_venues (
  name TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  capacity INT,
  map_url TEXT,
  official_url TEXT,
  access TEXT,
  notes TEXT
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE orbit_seed_keyaki_lives (
  name TEXT NOT NULL,
  live_type TEXT NOT NULL,
  performer_group_names TEXT[] NOT NULL,
  description TEXT
) ON COMMIT PRESERVE ROWS;

CREATE TEMP TABLE orbit_seed_keyaki_performances (
  live_name TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  performance_date DATE NOT NULL,
  doors_open_at TEXT,
  starts_at TEXT,
  has_streaming BOOLEAN NOT NULL DEFAULT false,
  has_live_viewing BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL
) ON COMMIT PRESERVE ROWS;

INSERT INTO orbit_seed_keyaki_venues (
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
    'オンライン配信',
    'オンライン',
    NULL,
    NULL,
    NULL,
    NULL,
    '無観客配信ライブ用の仮想会場'
  );

UPDATE public.orbit_venues AS venue
SET
  prefecture = COALESCE(NULLIF(venue.prefecture, ''), seed.prefecture),
  capacity = COALESCE(venue.capacity, seed.capacity),
  map_url = COALESCE(NULLIF(venue.map_url, ''), seed.map_url),
  official_url = COALESCE(NULLIF(venue.official_url, ''), seed.official_url),
  access = COALESCE(NULLIF(venue.access, ''), seed.access),
  notes = COALESCE(NULLIF(venue.notes, ''), seed.notes)
FROM orbit_seed_keyaki_venues seed
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
FROM orbit_seed_keyaki_venues seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_venues existing
  WHERE existing.name = seed.name
);

INSERT INTO orbit_seed_keyaki_lives (
  name,
  live_type,
  performer_group_names,
  description
)
VALUES
  (
    '欅共和国2017',
    'festival',
    ARRAY['欅坂46', 'けやき坂46'],
    '富士急ハイランド・コニファーフォレストで開催された野外ライブ。'
  ),
  (
    '欅共和国2018',
    'festival',
    ARRAY['欅坂46', 'けやき坂46'],
    '富士急ハイランド・コニファーフォレストで開催された野外ライブ。'
  ),
  (
    '欅共和国2019',
    'festival',
    ARRAY['欅坂46'],
    '富士急ハイランド・コニファーフォレストで開催された野外ライブ。'
  ),
  (
    '欅坂46 ARENA TOUR 2019 in TOKYO DOME',
    'tour',
    ARRAY['欅坂46'],
    '欅坂46初の東京ドーム公演。夏の全国アリーナツアー2019追加公演。'
  ),
  (
    'KEYAKIZAKA46 Live Online, but with YOU!',
    'online',
    ARRAY['欅坂46'],
    '無観客配信で開催された欅坂46のオンラインライブ。'
  ),
  (
    '欅坂46 THE LAST LIVE',
    'online',
    ARRAY['欅坂46'],
    '欅坂46名義でのラストライブ。'
  ),
  (
    'けやき坂46 日本武道館3DAYS!!',
    'single',
    ARRAY['けやき坂46'],
    '日本武道館で開催された、けやき坂46単独3DAYS公演。'
  ),
  (
    'ひらがなくりすます2018',
    'single',
    ARRAY['けやき坂46'],
    'けやき坂46のクリスマスライブ。'
  );

UPDATE public.orbit_lives AS live
SET
  live_type = seed.live_type,
  description = seed.description
FROM orbit_seed_keyaki_lives seed
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
FROM orbit_seed_keyaki_lives seed
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
FROM orbit_seed_keyaki_lives seed
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

INSERT INTO orbit_seed_keyaki_performances (
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
  ('欅共和国2017', '富士急ハイランドコニファーフォレスト', '2017-07-22', NULL, NULL, false, false, 0),
  ('欅共和国2017', '富士急ハイランドコニファーフォレスト', '2017-07-23', NULL, NULL, false, false, 1),

  ('欅共和国2018', '富士急ハイランドコニファーフォレスト', '2018-07-20', NULL, NULL, false, false, 0),
  ('欅共和国2018', '富士急ハイランドコニファーフォレスト', '2018-07-21', NULL, NULL, false, false, 1),
  ('欅共和国2018', '富士急ハイランドコニファーフォレスト', '2018-07-22', NULL, NULL, false, false, 2),

  ('欅共和国2019', '富士急ハイランドコニファーフォレスト', '2019-07-05', NULL, NULL, false, false, 0),
  ('欅共和国2019', '富士急ハイランドコニファーフォレスト', '2019-07-06', NULL, NULL, false, false, 1),
  ('欅共和国2019', '富士急ハイランドコニファーフォレスト', '2019-07-07', NULL, NULL, false, false, 2),

  ('欅坂46 ARENA TOUR 2019 in TOKYO DOME', '東京ドーム', '2019-09-18', NULL, NULL, false, false, 0),
  ('欅坂46 ARENA TOUR 2019 in TOKYO DOME', '東京ドーム', '2019-09-19', NULL, NULL, false, false, 1),

  ('KEYAKIZAKA46 Live Online, but with YOU!', 'オンライン配信', '2020-07-16', NULL, NULL, true, false, 0),

  ('欅坂46 THE LAST LIVE', 'オンライン配信', '2020-10-12', NULL, NULL, true, false, 0),
  ('欅坂46 THE LAST LIVE', 'オンライン配信', '2020-10-13', NULL, NULL, true, false, 1),

  ('けやき坂46 日本武道館3DAYS!!', '日本武道館', '2018-01-30', NULL, NULL, false, false, 0),
  ('けやき坂46 日本武道館3DAYS!!', '日本武道館', '2018-01-31', NULL, NULL, false, false, 1),
  ('けやき坂46 日本武道館3DAYS!!', '日本武道館', '2018-02-01', NULL, NULL, false, false, 2),

  ('ひらがなくりすます2018', '日本武道館', '2018-12-11', NULL, NULL, false, false, 0),
  ('ひらがなくりすます2018', '日本武道館', '2018-12-12', NULL, NULL, false, false, 1),
  ('ひらがなくりすます2018', '日本武道館', '2018-12-13', NULL, NULL, false, false, 2);

UPDATE public.orbit_live_performances AS performance
SET
  doors_open_at = NULLIF(seed.doors_open_at, ''),
  starts_at = NULLIF(seed.starts_at, ''),
  has_streaming = seed.has_streaming,
  has_live_viewing = seed.has_live_viewing,
  sort_order = seed.sort_order
FROM orbit_seed_keyaki_performances seed
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
FROM orbit_seed_keyaki_performances seed
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

DROP TABLE IF EXISTS orbit_seed_keyaki_performances;
DROP TABLE IF EXISTS orbit_seed_keyaki_lives;
DROP TABLE IF EXISTS orbit_seed_keyaki_venues;
END;
$seed$;
