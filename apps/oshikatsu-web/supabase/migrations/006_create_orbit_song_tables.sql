-- ============================================================
-- orbit_songs（楽曲）
-- ============================================================
CREATE TABLE orbit_songs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  lyrics_by     TEXT,
  music_by      TEXT,
  release_date  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_songs_title ON orbit_songs (title);
CREATE INDEX idx_orbit_songs_release_date ON orbit_songs (release_date);

-- ============================================================
-- orbit_song_groups（楽曲 × グループ M:N）
-- ============================================================
CREATE TABLE orbit_song_groups (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id   UUID NOT NULL REFERENCES orbit_songs(id) ON DELETE CASCADE,
  group_id  UUID NOT NULL REFERENCES orbit_groups(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_orbit_song_groups_unique ON orbit_song_groups (song_id, group_id);
CREATE INDEX idx_orbit_song_groups_song ON orbit_song_groups (song_id);
CREATE INDEX idx_orbit_song_groups_group ON orbit_song_groups (group_id);

-- ============================================================
-- orbit_song_members（楽曲 × メンバー + フォーメーション）
-- ============================================================
CREATE TABLE orbit_song_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id         UUID NOT NULL REFERENCES orbit_songs(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES orbit_members(id) ON DELETE CASCADE,
  position        TEXT NOT NULL CHECK (position IN ('フロント', '2列目', '3列目', 'アンダー')),
  position_order  INT NOT NULL DEFAULT 0,
  is_center       BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX idx_orbit_song_members_unique ON orbit_song_members (song_id, member_id);
CREATE INDEX idx_orbit_song_members_song ON orbit_song_members (song_id);
CREATE INDEX idx_orbit_song_members_member ON orbit_song_members (member_id);

-- ============================================================
-- RLS ポリシー
-- ============================================================
ALTER TABLE orbit_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_song_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_song_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_songs_select" ON orbit_songs FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_songs_insert" ON orbit_songs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "orbit_songs_update" ON orbit_songs FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_songs_delete" ON orbit_songs FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "orbit_song_groups_select" ON orbit_song_groups FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_song_groups_insert" ON orbit_song_groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "orbit_song_groups_delete" ON orbit_song_groups FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "orbit_song_members_select" ON orbit_song_members FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "orbit_song_members_insert" ON orbit_song_members FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "orbit_song_members_delete" ON orbit_song_members FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- updated_at トリガー（既存関数を再利用）
-- ============================================================
CREATE TRIGGER orbit_songs_updated_at
  BEFORE UPDATE ON orbit_songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
