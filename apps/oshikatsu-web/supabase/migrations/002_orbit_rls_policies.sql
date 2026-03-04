-- ============================================================
-- RLS 有効化
-- ============================================================
ALTER TABLE orbit_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_member_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_event_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_event_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- orbit_groups: 認証ユーザーのみ全操作可能
-- ============================================================
CREATE POLICY "orbit_groups_select" ON orbit_groups FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_groups_insert" ON orbit_groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "orbit_groups_update" ON orbit_groups FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_groups_delete" ON orbit_groups FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- orbit_members: 認証ユーザーのみ全操作可能
-- ============================================================
CREATE POLICY "orbit_members_select" ON orbit_members FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_members_insert" ON orbit_members FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "orbit_members_update" ON orbit_members FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_members_delete" ON orbit_members FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- orbit_member_groups: 認証ユーザーのみ全操作可能
-- ============================================================
CREATE POLICY "orbit_member_groups_select" ON orbit_member_groups FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_member_groups_insert" ON orbit_member_groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "orbit_member_groups_update" ON orbit_member_groups FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_member_groups_delete" ON orbit_member_groups FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- orbit_event_types: 認証ユーザーのみ全操作可能
-- ============================================================
CREATE POLICY "orbit_event_types_select" ON orbit_event_types FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_event_types_insert" ON orbit_event_types FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "orbit_event_types_update" ON orbit_event_types FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_event_types_delete" ON orbit_event_types FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- orbit_events: 認証ユーザーのみ全操作可能
-- ============================================================
CREATE POLICY "orbit_events_select" ON orbit_events FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_events_insert" ON orbit_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "orbit_events_update" ON orbit_events FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_events_delete" ON orbit_events FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- orbit_event_groups: 認証ユーザーのみ全操作可能
-- ============================================================
CREATE POLICY "orbit_event_groups_select" ON orbit_event_groups FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_event_groups_insert" ON orbit_event_groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "orbit_event_groups_update" ON orbit_event_groups FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_event_groups_delete" ON orbit_event_groups FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- orbit_event_members: 認証ユーザーのみ全操作可能
-- ============================================================
CREATE POLICY "orbit_event_members_select" ON orbit_event_members FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_event_members_insert" ON orbit_event_members FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "orbit_event_members_update" ON orbit_event_members FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_event_members_delete" ON orbit_event_members FOR DELETE
  USING (auth.role() = 'authenticated');
