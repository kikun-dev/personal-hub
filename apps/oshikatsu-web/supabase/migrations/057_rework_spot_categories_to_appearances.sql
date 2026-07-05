-- ============================================================
-- 057: スポットのカテゴリ廃止と出来事中心のモデルへの変更（#286 / PR #290）
-- ------------------------------------------------------------
-- 目的:
--   同じ場所で複数カテゴリの活動（例: MV撮影とヒット祈願）があると
--   スポット単一の category を決められないため、スポット自体のカテゴリを
--   廃止し、「何の場所か」は出来事（orbit_spot_appearances）の種別の
--   集合で表現する（出来事はアプリ層で1件以上必須にする）。
--   あわせて出来事の種別を拡充し、種別ごとの「サブ種別」マスタ
--   （例: のぎ動画→あそぶだけ、YouTube→天さんぽ）を新設する。
--
-- 変更内容:
--   (1) orbit_spot_source_subtypes を新設（source_type × name で一意。
--       フォームから新規追加できる選択式マスタ。RLS は標準パターン）
--   (2) orbit_spot_appearances:
--       - group_id（orbit_groups への FK）と subtype_id を追加。
--         既存行が存在しうるため DB では NULL 許容とし、
--         group はアプリ層（validateSpot）で必須にする
--       - source_type の CHECK を拡充（youtube / lemino / tv /
--         nogi_video / magazine / photobook / blog_sns を追加）
--       - series_name / appeared_on を削除（種別・サブ種別でカバー）
--   (3) orbit_spots: category とそのインデックスを削除
--
-- ロールバック方針:
--   1. ALTER TABLE orbit_spots ADD COLUMN category TEXT NOT NULL DEFAULT 'other'
--        CHECK (category IN ('mv_location','show_location','hit_kigan','live_related','other'));
--      CREATE INDEX idx_orbit_spots_category ON orbit_spots (category);
--      （旧 category 値は復元不能。デフォルト 'other' で埋める）
--   2. ALTER TABLE orbit_spot_appearances
--        DROP COLUMN group_id, DROP COLUMN subtype_id,
--        ADD COLUMN series_name TEXT, ADD COLUMN appeared_on DATE;
--      source_type CHECK は 055 の5値に戻す（拡張値の行は事前に削除が必要）
--   3. DROP TABLE orbit_spot_source_subtypes;
-- ============================================================

-- ============================================================
-- (1) orbit_spot_source_subtypes — 種別ごとのサブ種別マスタ
-- ============================================================
CREATE TABLE orbit_spot_source_subtypes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type  TEXT NOT NULL,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orbit_spot_source_subtypes_unique
  ON orbit_spot_source_subtypes (source_type, name);

ALTER TABLE orbit_spot_source_subtypes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_spot_source_subtypes_select" ON orbit_spot_source_subtypes FOR SELECT
  USING ((select public.has_orbit_read_role()));
CREATE POLICY "orbit_spot_source_subtypes_insert" ON orbit_spot_source_subtypes FOR INSERT
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_spot_source_subtypes_update" ON orbit_spot_source_subtypes FOR UPDATE
  USING ((select public.is_orbit_admin()))
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_spot_source_subtypes_delete" ON orbit_spot_source_subtypes FOR DELETE
  USING ((select public.is_orbit_admin()));

-- ============================================================
-- (2) orbit_spot_appearances の変更
-- ============================================================
ALTER TABLE orbit_spot_appearances
  ADD COLUMN group_id UUID REFERENCES orbit_groups(id) ON DELETE RESTRICT,
  ADD COLUMN subtype_id UUID REFERENCES orbit_spot_source_subtypes(id) ON DELETE SET NULL,
  DROP COLUMN series_name,
  DROP COLUMN appeared_on;

CREATE INDEX idx_orbit_spot_appearances_group_id ON orbit_spot_appearances (group_id);
CREATE INDEX idx_orbit_spot_appearances_subtype_id ON orbit_spot_appearances (subtype_id);

ALTER TABLE orbit_spot_appearances
  DROP CONSTRAINT orbit_spot_appearances_source_type_check;

ALTER TABLE orbit_spot_appearances
  ADD CONSTRAINT orbit_spot_appearances_source_type_check
  CHECK (source_type IN (
    'mv', 'video', 'event', 'live',
    'youtube', 'lemino', 'tv', 'nogi_video',
    'magazine', 'photobook', 'blog_sns', 'other'
  ));

-- ============================================================
-- (3) orbit_spots.category の削除
-- ============================================================
DROP INDEX idx_orbit_spots_category;

ALTER TABLE orbit_spots
  DROP COLUMN category;
