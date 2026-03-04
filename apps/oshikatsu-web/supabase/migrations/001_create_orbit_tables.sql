-- ============================================================
-- orbit_groups（グループ）
-- ============================================================
CREATE TABLE orbit_groups (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ja       TEXT NOT NULL UNIQUE,
  name_en       TEXT,
  color         TEXT NOT NULL DEFAULT '#666666',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  successor_id  UUID REFERENCES orbit_groups(id),
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- orbit_members（メンバー）
-- ============================================================
CREATE TABLE orbit_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ja         TEXT NOT NULL,
  name_kana       TEXT NOT NULL,
  name_en         TEXT,
  date_of_birth   DATE,
  blood_type      TEXT CHECK (blood_type IN ('A', 'B', 'O', 'AB')),
  height_cm       SMALLINT,
  hometown        TEXT,
  image_url       TEXT,
  blog_url        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_members_name_kana ON orbit_members (name_kana);

-- ============================================================
-- orbit_member_groups（メンバー×グループ 多対多）
-- ============================================================
CREATE TABLE orbit_member_groups (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id     UUID NOT NULL REFERENCES orbit_members(id) ON DELETE CASCADE,
  group_id      UUID NOT NULL REFERENCES orbit_groups(id) ON DELETE CASCADE,
  generation    TEXT,
  joined_at     DATE,
  graduated_at  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_member_groups_member ON orbit_member_groups (member_id);
CREATE INDEX idx_orbit_member_groups_group ON orbit_member_groups (group_id);
CREATE UNIQUE INDEX idx_orbit_member_groups_unique
  ON orbit_member_groups (member_id, group_id);

-- ============================================================
-- orbit_event_types（イベント種別）
-- ============================================================
CREATE TABLE orbit_event_types (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL DEFAULT '#666666',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- orbit_events（イベント）
-- ============================================================
CREATE TABLE orbit_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type_id   UUID NOT NULL REFERENCES orbit_event_types(id),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  date            DATE NOT NULL,
  end_date        DATE,
  start_time      TIME,
  venue           TEXT,
  url             TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_events_date ON orbit_events (date);
CREATE INDEX idx_orbit_events_date_range ON orbit_events (date, end_date);

-- ============================================================
-- orbit_event_groups（イベント×グループ）
-- ============================================================
CREATE TABLE orbit_event_groups (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id  UUID NOT NULL REFERENCES orbit_events(id) ON DELETE CASCADE,
  group_id  UUID NOT NULL REFERENCES orbit_groups(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_orbit_event_groups_unique
  ON orbit_event_groups (event_id, group_id);

-- ============================================================
-- orbit_event_members（イベント×メンバー）
-- ============================================================
CREATE TABLE orbit_event_members (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   UUID NOT NULL REFERENCES orbit_events(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES orbit_members(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_orbit_event_members_unique
  ON orbit_event_members (event_id, member_id);

-- ============================================================
-- updated_at 自動更新トリガー（既存の関数を再利用）
-- ============================================================
CREATE TRIGGER orbit_groups_updated_at
  BEFORE UPDATE ON orbit_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orbit_members_updated_at
  BEFORE UPDATE ON orbit_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orbit_events_updated_at
  BEFORE UPDATE ON orbit_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
