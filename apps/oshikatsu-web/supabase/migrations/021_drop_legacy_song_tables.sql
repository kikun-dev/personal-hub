-- ============================================================
-- 021: 旧楽曲テーブルの撤去（ゼロ再構築方針）
-- ============================================================

DROP TABLE IF EXISTS orbit_song_members CASCADE;
DROP TABLE IF EXISTS orbit_song_groups CASCADE;
DROP TABLE IF EXISTS orbit_songs CASCADE;
