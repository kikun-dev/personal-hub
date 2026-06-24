-- ============================================================
-- Orbit seed fix: Hinatazaka46 recent single track corrections
-- ============================================================
-- Corrects provisional rows from 032_seed_sakamichi_single_tracks_expanded.sql.
-- Safe to run even if 032 has not been executed.
-- ============================================================

BEGIN;
SET CONSTRAINTS ALL DEFERRED;

CREATE TEMP TABLE orbit_seed_wrong_hinata_tracks (
  release_title TEXT NOT NULL,
  release_numbering INT NOT NULL,
  track_title TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO orbit_seed_wrong_hinata_tracks (
  release_title,
  release_numbering,
  track_title
)
VALUES
  ('絶対的第六感', 12, '君のために何ができるだろう'),
  ('お願いバッハ!', 15, 'ただがむしゃらに'),
  ('お願いバッハ!', 15, '君のしか勝たんのだ'),
  ('お願いバッハ!', 15, 'キレイになりたい'),
  ('お願いバッハ!', 15, 'まさかのConfession'),
  ('お願いバッハ!', 15, '言葉は限りなく不自由だ');

CREATE TEMP TABLE orbit_seed_deleted_track_ids (
  track_id UUID PRIMARY KEY
) ON COMMIT DROP;

WITH targets AS (
  SELECT
    release.id AS release_id,
    track.id AS track_id
  FROM orbit_seed_wrong_hinata_tracks wrong
  JOIN public.orbit_groups release_group
    ON release_group.name_ja = '日向坂46'
  JOIN public.orbit_releases release
    ON release.title = wrong.release_title
    AND release.group_id = release_group.id
    AND release.release_type = 'single'
    AND release.numbering = wrong.release_numbering
  JOIN public.orbit_groups track_group
    ON track_group.name_ja = '日向坂46'
  JOIN public.orbit_tracks track
    ON track.title = wrong.track_title
    AND track.group_id = track_group.id
),
deleted_links AS (
  DELETE FROM public.orbit_release_tracks release_track
  USING targets
  WHERE release_track.release_id = targets.release_id
    AND release_track.track_id = targets.track_id
  RETURNING release_track.track_id
)
INSERT INTO orbit_seed_deleted_track_ids (track_id)
SELECT DISTINCT track_id
FROM deleted_links
ON CONFLICT DO NOTHING;

DELETE FROM public.orbit_tracks track
USING orbit_seed_deleted_track_ids deleted
WHERE track.id = deleted.track_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.orbit_release_tracks release_track
    WHERE release_track.track_id = track.id
  );

CREATE TEMP TABLE orbit_seed_correct_hinata_track_groups (
  release_title TEXT NOT NULL,
  release_numbering INT NOT NULL,
  track_titles TEXT[] NOT NULL
) ON COMMIT DROP;

INSERT INTO orbit_seed_correct_hinata_track_groups (
  release_title,
  release_numbering,
  track_titles
)
VALUES
  ('絶対的第六感', 12, ARRAY[
    '絶対的第六感',
    '君を覚えてない',
    '永遠のソフィア',
    'どっちが先に言う?',
    '妄想コスモス',
    '雪は降る 心の世界に',
    '夕陽Dance'
  ]),
  ('お願いバッハ!', 15, ARRAY[
    'お願いバッハ!',
    '空飛ぶ車',
    'ライバル多すぎ問題',
    '愛はこっちのものだ 2025',
    '言葉の限界',
    'ハロウィンのカボチャが割れた 2025',
    'Expected value'
  ]),
  ('クリフハンガー', 16, ARRAY[
    'クリフハンガー',
    '君と生きる',
    '好きになるクレッシェンド',
    'Surf''s Up Girl',
    '涙目の太陽',
    '恋と慣性の法則',
    'Second Jump'
  ]);

CREATE TEMP TABLE orbit_seed_correct_hinata_tracks ON COMMIT DROP AS
SELECT
  groups.release_title,
  groups.release_numbering,
  track_title,
  track_order::INT
FROM orbit_seed_correct_hinata_track_groups groups
CROSS JOIN LATERAL unnest(groups.track_titles) WITH ORDINALITY AS tracks(track_title, track_order);

CREATE TEMP TABLE orbit_seed_resolved_correct_hinata_tracks ON COMMIT DROP AS
SELECT
  seed.*,
  release.id AS release_id,
  track_group.id AS track_group_id
FROM orbit_seed_correct_hinata_tracks seed
JOIN public.orbit_groups release_group
  ON release_group.name_ja = '日向坂46'
JOIN public.orbit_releases release
  ON release.title = seed.release_title
  AND release.group_id = release_group.id
  AND release.release_type = 'single'
  AND release.numbering = seed.release_numbering
JOIN public.orbit_groups track_group
  ON track_group.name_ja = '日向坂46';

INSERT INTO public.orbit_tracks (
  title,
  group_id
)
SELECT DISTINCT
  seed.track_title,
  seed.track_group_id
FROM orbit_seed_resolved_correct_hinata_tracks seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.orbit_tracks existing
  WHERE existing.title = seed.track_title
    AND existing.group_id = seed.track_group_id
);

WITH missing_links AS (
  SELECT
    seed.release_id,
    track.id AS track_id,
    seed.track_order,
    seed.track_title
  FROM orbit_seed_resolved_correct_hinata_tracks seed
  JOIN public.orbit_tracks track
    ON track.title = seed.track_title
    AND track.group_id = seed.track_group_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.orbit_release_tracks existing
    WHERE existing.release_id = seed.release_id
      AND existing.track_id = track.id
  )
),
current_max AS (
  SELECT
    release_id,
    MAX(track_number) AS max_track_number
  FROM public.orbit_release_tracks
  GROUP BY release_id
),
numbered_links AS (
  SELECT
    missing.release_id,
    missing.track_id,
    COALESCE(current_max.max_track_number, 0)
      + ROW_NUMBER() OVER (
          PARTITION BY missing.release_id
          ORDER BY missing.track_order, missing.track_title
        ) AS track_number
  FROM missing_links missing
  LEFT JOIN current_max
    ON current_max.release_id = missing.release_id
)
INSERT INTO public.orbit_release_tracks (
  release_id,
  track_id,
  track_number
)
SELECT
  release_id,
  track_id,
  track_number::INT
FROM numbered_links
ON CONFLICT (release_id, track_id) DO NOTHING;

COMMIT;
