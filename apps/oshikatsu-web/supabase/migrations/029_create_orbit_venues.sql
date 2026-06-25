-- ============================================================
-- orbit_venues（会場マスタ）
-- ライブ公演（後続 Issue #100）から参照される会場の基本情報を管理する
-- ============================================================
CREATE TABLE orbit_venues (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  prefecture  TEXT,
  address     TEXT,
  capacity    INT CHECK (capacity > 0),
  access      TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_venues_name ON orbit_venues (name);

ALTER TABLE orbit_venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_venues_select" ON orbit_venues FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_venues_insert" ON orbit_venues FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_venues_update" ON orbit_venues FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_venues_delete" ON orbit_venues FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE TRIGGER orbit_venues_updated_at
  BEFORE UPDATE ON orbit_venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
