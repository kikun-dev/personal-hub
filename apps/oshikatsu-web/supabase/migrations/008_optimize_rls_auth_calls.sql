-- ============================================================
-- 008: RLS の auth 関数呼び出し最適化
-- Supabase Performance Advisor (auth_rls_initplan) 対応
-- ============================================================

-- orbit_groups
ALTER POLICY "orbit_groups_select" ON orbit_groups
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_groups_insert" ON orbit_groups
  WITH CHECK ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_groups_update" ON orbit_groups
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_groups_delete" ON orbit_groups
  USING ((select auth.role()) = 'authenticated');

-- orbit_members
ALTER POLICY "orbit_members_select" ON orbit_members
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_members_insert" ON orbit_members
  WITH CHECK ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_members_update" ON orbit_members
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_members_delete" ON orbit_members
  USING ((select auth.role()) = 'authenticated');

-- orbit_member_groups
ALTER POLICY "orbit_member_groups_select" ON orbit_member_groups
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_member_groups_insert" ON orbit_member_groups
  WITH CHECK ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_member_groups_update" ON orbit_member_groups
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_member_groups_delete" ON orbit_member_groups
  USING ((select auth.role()) = 'authenticated');

-- orbit_event_types
ALTER POLICY "orbit_event_types_select" ON orbit_event_types
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_event_types_insert" ON orbit_event_types
  WITH CHECK ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_event_types_update" ON orbit_event_types
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_event_types_delete" ON orbit_event_types
  USING ((select auth.role()) = 'authenticated');

-- orbit_events
ALTER POLICY "orbit_events_select" ON orbit_events
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_events_insert" ON orbit_events
  WITH CHECK ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_events_update" ON orbit_events
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_events_delete" ON orbit_events
  USING ((select auth.role()) = 'authenticated');

-- orbit_event_groups
ALTER POLICY "orbit_event_groups_select" ON orbit_event_groups
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_event_groups_insert" ON orbit_event_groups
  WITH CHECK ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_event_groups_update" ON orbit_event_groups
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_event_groups_delete" ON orbit_event_groups
  USING ((select auth.role()) = 'authenticated');

-- orbit_event_members
ALTER POLICY "orbit_event_members_select" ON orbit_event_members
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_event_members_insert" ON orbit_event_members
  WITH CHECK ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_event_members_update" ON orbit_event_members
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_event_members_delete" ON orbit_event_members
  USING ((select auth.role()) = 'authenticated');

-- orbit_songs
ALTER POLICY "orbit_songs_select" ON orbit_songs
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_songs_insert" ON orbit_songs
  WITH CHECK ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_songs_update" ON orbit_songs
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_songs_delete" ON orbit_songs
  USING ((select auth.role()) = 'authenticated');

-- orbit_song_groups
ALTER POLICY "orbit_song_groups_select" ON orbit_song_groups
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_song_groups_insert" ON orbit_song_groups
  WITH CHECK ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_song_groups_delete" ON orbit_song_groups
  USING ((select auth.role()) = 'authenticated');

-- orbit_song_members
ALTER POLICY "orbit_song_members_select" ON orbit_song_members
  USING ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_song_members_insert" ON orbit_song_members
  WITH CHECK ((select auth.role()) = 'authenticated');
ALTER POLICY "orbit_song_members_delete" ON orbit_song_members
  USING ((select auth.role()) = 'authenticated');
