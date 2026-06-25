-- ============================================================
-- ライブ + 公演（#98 / #100）
-- ライブ（親）に公演（会場×日程）が複数ぶら下がる。出演はライブ単位で
-- グループ + メンバー（基準ロスター）を持ち、休演は公演ごとに記録する。
-- ============================================================

-- orbit_lives（ライブ）
CREATE TABLE orbit_lives (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  live_type    TEXT NOT NULL
               CHECK (live_type IN ('live', 'festival', 'online', 'other')),
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- orbit_live_performer_groups（出演グループ＝表示用）
CREATE TABLE orbit_live_performer_groups (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id   UUID NOT NULL REFERENCES orbit_lives(id) ON DELETE CASCADE,
  group_id  UUID NOT NULL REFERENCES orbit_groups(id) ON DELETE RESTRICT,
  UNIQUE (live_id, group_id)
);
CREATE INDEX idx_orbit_live_performer_groups_live_id
  ON orbit_live_performer_groups (live_id);
CREATE INDEX idx_orbit_live_performer_groups_group_id
  ON orbit_live_performer_groups (group_id);

-- orbit_live_performer_members（出演メンバー基準ロスター）
CREATE TABLE orbit_live_performer_members (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id    UUID NOT NULL REFERENCES orbit_lives(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES orbit_members(id) ON DELETE RESTRICT,
  UNIQUE (live_id, member_id)
);
CREATE INDEX idx_orbit_live_performer_members_live_id
  ON orbit_live_performer_members (live_id);
CREATE INDEX idx_orbit_live_performer_members_member_id
  ON orbit_live_performer_members (member_id);

-- orbit_live_performances（公演＝会場×日程）
CREATE TABLE orbit_live_performances (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id          UUID NOT NULL REFERENCES orbit_lives(id) ON DELETE CASCADE,
  venue_id         UUID REFERENCES orbit_venues(id) ON DELETE RESTRICT,
  performance_date DATE,
  doors_open_at    TEXT,
  starts_at        TEXT,
  session_label    TEXT,
  has_streaming    BOOLEAN NOT NULL DEFAULT false,
  has_live_viewing BOOLEAN NOT NULL DEFAULT false,
  ticket_info      TEXT,
  seat_info        TEXT,
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orbit_live_performances_live_id
  ON orbit_live_performances (live_id);
CREATE INDEX idx_orbit_live_performances_venue_id
  ON orbit_live_performances (venue_id);
CREATE INDEX idx_orbit_live_performances_date
  ON orbit_live_performances (performance_date);

-- orbit_live_performance_absences（公演ごとの休演メンバー）
CREATE TABLE orbit_live_performance_absences (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  performance_id  UUID NOT NULL REFERENCES orbit_live_performances(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES orbit_members(id) ON DELETE RESTRICT,
  note            TEXT,
  UNIQUE (performance_id, member_id)
);
CREATE INDEX idx_orbit_live_performance_absences_performance_id
  ON orbit_live_performance_absences (performance_id);
CREATE INDEX idx_orbit_live_performance_absences_member_id
  ON orbit_live_performance_absences (member_id);

-- RLS
ALTER TABLE orbit_lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_live_performer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_live_performer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_live_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_live_performance_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_lives_select" ON orbit_lives FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_lives_insert" ON orbit_lives FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_lives_update" ON orbit_lives FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_lives_delete" ON orbit_lives FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_live_performer_groups_select" ON orbit_live_performer_groups FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performer_groups_insert" ON orbit_live_performer_groups FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performer_groups_update" ON orbit_live_performer_groups FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performer_groups_delete" ON orbit_live_performer_groups FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_live_performer_members_select" ON orbit_live_performer_members FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performer_members_insert" ON orbit_live_performer_members FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performer_members_update" ON orbit_live_performer_members FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performer_members_delete" ON orbit_live_performer_members FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_live_performances_select" ON orbit_live_performances FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performances_insert" ON orbit_live_performances FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performances_update" ON orbit_live_performances FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performances_delete" ON orbit_live_performances FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_live_performance_absences_select" ON orbit_live_performance_absences FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performance_absences_insert" ON orbit_live_performance_absences FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performance_absences_update" ON orbit_live_performance_absences FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_live_performance_absences_delete" ON orbit_live_performance_absences FOR DELETE
  USING ((select auth.role()) = 'authenticated');

-- updated_at トリガ
CREATE TRIGGER orbit_lives_updated_at
  BEFORE UPDATE ON orbit_lives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orbit_live_performances_updated_at
  BEFORE UPDATE ON orbit_live_performances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
