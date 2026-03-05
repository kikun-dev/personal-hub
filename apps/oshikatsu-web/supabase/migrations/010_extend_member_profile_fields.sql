-- ============================================================
-- メンバー拡張項目
-- ============================================================
ALTER TABLE orbit_members
  ADD COLUMN zodiac TEXT,
  ADD COLUMN call_name TEXT,
  ADD COLUMN penlight_color_1 TEXT,
  ADD COLUMN penlight_color_2 TEXT;

ALTER TABLE orbit_members
  ADD CONSTRAINT orbit_members_penlight_colors_pair_check
  CHECK (
    (penlight_color_1 IS NULL AND penlight_color_2 IS NULL)
    OR
    (penlight_color_1 IS NOT NULL AND penlight_color_2 IS NOT NULL)
  );

-- ============================================================
-- グループ拡張項目（期生上限）
-- ============================================================
ALTER TABLE orbit_groups
  ADD COLUMN max_generation INT NOT NULL DEFAULT 20;

ALTER TABLE orbit_groups
  ADD CONSTRAINT orbit_groups_max_generation_check
  CHECK (max_generation > 0 AND max_generation <= 50);

-- ============================================================
-- グループごとのサイリウム候補色
-- ============================================================
CREATE TABLE orbit_group_penlight_colors (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id    UUID NOT NULL REFERENCES orbit_groups(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  hex         TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_group_penlight_colors_group
  ON orbit_group_penlight_colors (group_id);
CREATE UNIQUE INDEX idx_orbit_group_penlight_colors_group_hex
  ON orbit_group_penlight_colors (group_id, hex);

-- 既存グループ向けの初期候補色（最低2色）
INSERT INTO orbit_group_penlight_colors (group_id, name, hex, sort_order)
SELECT id, 'グループカラー', color, 1
FROM orbit_groups
ON CONFLICT (group_id, hex) DO NOTHING;

INSERT INTO orbit_group_penlight_colors (group_id, name, hex, sort_order)
SELECT id, 'ホワイト', '#FFFFFF', 2
FROM orbit_groups
ON CONFLICT (group_id, hex) DO NOTHING;

-- ============================================================
-- メンバーSNS（複数）
-- ============================================================
CREATE TABLE orbit_member_sns (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id      UUID NOT NULL REFERENCES orbit_members(id) ON DELETE CASCADE,
  sns_type       TEXT NOT NULL CHECK (sns_type IN ('x', 'instagram', 'tiktok', 'youtube', 'blog', 'other')),
  display_name   TEXT NOT NULL,
  url            TEXT NOT NULL,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_member_sns_member
  ON orbit_member_sns (member_id);

-- ============================================================
-- メンバーレギュラー仕事（複数）
-- ============================================================
CREATE TABLE orbit_member_regular_works (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id      UUID NOT NULL REFERENCES orbit_members(id) ON DELETE CASCADE,
  work_type      TEXT NOT NULL CHECK (work_type IN ('tv', 'radio', 'web', 'stage', 'magazine', 'other')),
  name           TEXT NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orbit_member_regular_works_date_check
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_orbit_member_regular_works_member
  ON orbit_member_regular_works (member_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE orbit_group_penlight_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_member_sns ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_member_regular_works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_group_penlight_colors_select" ON orbit_group_penlight_colors FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_group_penlight_colors_insert" ON orbit_group_penlight_colors FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_group_penlight_colors_update" ON orbit_group_penlight_colors FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_group_penlight_colors_delete" ON orbit_group_penlight_colors FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_member_sns_select" ON orbit_member_sns FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_member_sns_insert" ON orbit_member_sns FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_member_sns_update" ON orbit_member_sns FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_member_sns_delete" ON orbit_member_sns FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_member_regular_works_select" ON orbit_member_regular_works FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_member_regular_works_insert" ON orbit_member_regular_works FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_member_regular_works_update" ON orbit_member_regular_works FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_member_regular_works_delete" ON orbit_member_regular_works FOR DELETE
  USING ((select auth.role()) = 'authenticated');
