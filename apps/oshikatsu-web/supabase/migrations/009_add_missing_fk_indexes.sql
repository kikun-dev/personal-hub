-- ============================================================
-- 009: FK 列の不足インデックス追加
-- Supabase Performance Advisor (unindexed_foreign_keys) 対応
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orbit_groups_successor_id
  ON orbit_groups (successor_id);

CREATE INDEX IF NOT EXISTS idx_orbit_events_event_type_id
  ON orbit_events (event_type_id);

CREATE INDEX IF NOT EXISTS idx_orbit_event_groups_group_id
  ON orbit_event_groups (group_id);

CREATE INDEX IF NOT EXISTS idx_orbit_event_members_member_id
  ON orbit_event_members (member_id);
