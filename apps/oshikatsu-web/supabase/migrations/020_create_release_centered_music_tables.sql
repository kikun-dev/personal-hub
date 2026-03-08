-- ============================================================
-- 020: 楽曲DB再設計（リリース中心モデル）
-- ============================================================

-- ============================================================
-- Storage buckets（リリース画像 / 衣装画像）
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'release-images',
    'release-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'track-costume-images',
    'track-costume-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "release_images_insert" ON storage.objects;
CREATE POLICY "release_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'release-images');

DROP POLICY IF EXISTS "release_images_update" ON storage.objects;
CREATE POLICY "release_images_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'release-images')
WITH CHECK (bucket_id = 'release-images');

DROP POLICY IF EXISTS "release_images_delete" ON storage.objects;
CREATE POLICY "release_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'release-images');

DROP POLICY IF EXISTS "track_costume_images_insert" ON storage.objects;
CREATE POLICY "track_costume_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'track-costume-images');

DROP POLICY IF EXISTS "track_costume_images_update" ON storage.objects;
CREATE POLICY "track_costume_images_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'track-costume-images')
WITH CHECK (bucket_id = 'track-costume-images');

DROP POLICY IF EXISTS "track_costume_images_delete" ON storage.objects;
CREATE POLICY "track_costume_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'track-costume-images');

-- ============================================================
-- orbit_people（人物マスタ）
-- ============================================================
CREATE TABLE orbit_people (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name  TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_people_display_name ON orbit_people (display_name);

-- ============================================================
-- orbit_releases（リリース）
-- ============================================================
CREATE TABLE orbit_releases (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  group_id      UUID NOT NULL REFERENCES orbit_groups(id) ON DELETE RESTRICT,
  release_type  TEXT NOT NULL
               CHECK (release_type IN ('single', 'album', 'digital_single', 'other')),
  numbering     INT CHECK (numbering > 0),
  release_date  DATE,
  artwork_path  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orbit_releases_numbering_rule CHECK (
    (
      release_type IN ('single', 'album')
      AND numbering IS NOT NULL
    ) OR (
      release_type IN ('digital_single', 'other')
      AND numbering IS NULL
    )
  )
);

CREATE INDEX idx_orbit_releases_group_id ON orbit_releases (group_id);
CREATE INDEX idx_orbit_releases_release_type ON orbit_releases (release_type);
CREATE INDEX idx_orbit_releases_release_date ON orbit_releases (release_date);

-- ============================================================
-- orbit_release_bonus_videos（特典映像）
-- ============================================================
CREATE TABLE orbit_release_bonus_videos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id   UUID NOT NULL REFERENCES orbit_releases(id) ON DELETE CASCADE,
  edition      TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_release_bonus_videos_release_id
  ON orbit_release_bonus_videos (release_id);

-- ============================================================
-- orbit_release_members（リリース参加メンバー）
-- ============================================================
CREATE TABLE orbit_release_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id  UUID NOT NULL REFERENCES orbit_releases(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES orbit_members(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orbit_release_members_unique
  ON orbit_release_members (release_id, member_id);
CREATE INDEX idx_orbit_release_members_release_id
  ON orbit_release_members (release_id);
CREATE INDEX idx_orbit_release_members_member_id
  ON orbit_release_members (member_id);

-- ============================================================
-- orbit_tracks（楽曲）
-- ============================================================
CREATE TABLE orbit_tracks (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title             TEXT NOT NULL,
  duration_seconds  INT CHECK (duration_seconds > 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_tracks_title ON orbit_tracks (title);

-- ============================================================
-- orbit_release_tracks（リリース × 楽曲 + 曲順）
-- ============================================================
CREATE TABLE orbit_release_tracks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id    UUID NOT NULL REFERENCES orbit_releases(id) ON DELETE CASCADE,
  track_id      UUID NOT NULL REFERENCES orbit_tracks(id) ON DELETE CASCADE,
  track_number  INT NOT NULL CHECK (track_number > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orbit_release_tracks_unique_release_track
  ON orbit_release_tracks (release_id, track_id);
CREATE UNIQUE INDEX idx_orbit_release_tracks_unique_release_track_number
  ON orbit_release_tracks (release_id, track_number);
CREATE INDEX idx_orbit_release_tracks_track_id ON orbit_release_tracks (track_id);
CREATE INDEX idx_orbit_release_tracks_release_id ON orbit_release_tracks (release_id);

-- ============================================================
-- orbit_track_credits（クレジット）
-- ============================================================
CREATE TABLE orbit_track_credits (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id     UUID NOT NULL REFERENCES orbit_tracks(id) ON DELETE CASCADE,
  credit_role  TEXT NOT NULL CHECK (credit_role IN ('lyrics', 'music', 'arrangement', 'choreography')),
  person_id    UUID NOT NULL REFERENCES orbit_people(id) ON DELETE RESTRICT,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orbit_track_credits_unique
  ON orbit_track_credits (track_id, credit_role, person_id);
CREATE INDEX idx_orbit_track_credits_track_id ON orbit_track_credits (track_id);

-- ============================================================
-- orbit_track_formations（フォーメーション本体）
-- ============================================================
CREATE TABLE orbit_track_formations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id      UUID NOT NULL UNIQUE REFERENCES orbit_tracks(id) ON DELETE CASCADE,
  column_count  INT NOT NULL CHECK (column_count > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- orbit_track_formation_rows（フォーメーション列定義）
-- ============================================================
CREATE TABLE orbit_track_formation_rows (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formation_id  UUID NOT NULL REFERENCES orbit_track_formations(id) ON DELETE CASCADE,
  row_number    INT NOT NULL CHECK (row_number > 0),
  member_count  INT NOT NULL CHECK (member_count >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orbit_track_formation_rows_unique
  ON orbit_track_formation_rows (formation_id, row_number);
CREATE INDEX idx_orbit_track_formation_rows_formation_id
  ON orbit_track_formation_rows (formation_id);

-- ============================================================
-- orbit_track_formation_members（フォーメーション割当）
-- ============================================================
CREATE TABLE orbit_track_formation_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formation_row_id UUID NOT NULL REFERENCES orbit_track_formation_rows(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES orbit_members(id) ON DELETE RESTRICT,
  slot_order      INT NOT NULL CHECK (slot_order >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orbit_track_formation_members_unique_slot
  ON orbit_track_formation_members (formation_row_id, slot_order);
CREATE UNIQUE INDEX idx_orbit_track_formation_members_unique_member_in_row
  ON orbit_track_formation_members (formation_row_id, member_id);
CREATE INDEX idx_orbit_track_formation_members_member_id
  ON orbit_track_formation_members (member_id);

-- ============================================================
-- orbit_track_mvs（MV）
-- ============================================================
CREATE TABLE orbit_track_mvs (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id            UUID NOT NULL UNIQUE REFERENCES orbit_tracks(id) ON DELETE CASCADE,
  mv_url              TEXT NOT NULL,
  director_person_id  UUID REFERENCES orbit_people(id) ON DELETE RESTRICT,
  location            TEXT,
  published_on        DATE,
  memo                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_track_mvs_track_id ON orbit_track_mvs (track_id);

-- ============================================================
-- orbit_track_costumes（衣装）
-- ============================================================
CREATE TABLE orbit_track_costumes (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id          UUID NOT NULL REFERENCES orbit_tracks(id) ON DELETE CASCADE,
  stylist_person_id UUID NOT NULL REFERENCES orbit_people(id) ON DELETE RESTRICT,
  image_path        TEXT NOT NULL,
  note              TEXT,
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_track_costumes_track_id ON orbit_track_costumes (track_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE orbit_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_release_bonus_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_release_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_release_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_track_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_track_formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_track_formation_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_track_formation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_track_mvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_track_costumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_people_select" ON orbit_people FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_people_insert" ON orbit_people FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_people_update" ON orbit_people FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_people_delete" ON orbit_people FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_releases_select" ON orbit_releases FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_releases_insert" ON orbit_releases FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_releases_update" ON orbit_releases FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_releases_delete" ON orbit_releases FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_release_bonus_videos_select" ON orbit_release_bonus_videos FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_bonus_videos_insert" ON orbit_release_bonus_videos FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_bonus_videos_update" ON orbit_release_bonus_videos FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_bonus_videos_delete" ON orbit_release_bonus_videos FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_release_members_select" ON orbit_release_members FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_members_insert" ON orbit_release_members FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_members_update" ON orbit_release_members FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_members_delete" ON orbit_release_members FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_tracks_select" ON orbit_tracks FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_tracks_insert" ON orbit_tracks FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_tracks_update" ON orbit_tracks FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_tracks_delete" ON orbit_tracks FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_release_tracks_select" ON orbit_release_tracks FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_tracks_insert" ON orbit_release_tracks FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_tracks_update" ON orbit_release_tracks FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_tracks_delete" ON orbit_release_tracks FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_track_credits_select" ON orbit_track_credits FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_credits_insert" ON orbit_track_credits FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_credits_update" ON orbit_track_credits FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_credits_delete" ON orbit_track_credits FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_track_formations_select" ON orbit_track_formations FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_formations_insert" ON orbit_track_formations FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_formations_update" ON orbit_track_formations FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_formations_delete" ON orbit_track_formations FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_track_formation_rows_select" ON orbit_track_formation_rows FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_formation_rows_insert" ON orbit_track_formation_rows FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_formation_rows_update" ON orbit_track_formation_rows FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_formation_rows_delete" ON orbit_track_formation_rows FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_track_formation_members_select" ON orbit_track_formation_members FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_formation_members_insert" ON orbit_track_formation_members FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_formation_members_update" ON orbit_track_formation_members FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_formation_members_delete" ON orbit_track_formation_members FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_track_mvs_select" ON orbit_track_mvs FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_mvs_insert" ON orbit_track_mvs FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_mvs_update" ON orbit_track_mvs FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_mvs_delete" ON orbit_track_mvs FOR DELETE
  USING ((select auth.role()) = 'authenticated');

CREATE POLICY "orbit_track_costumes_select" ON orbit_track_costumes FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_costumes_insert" ON orbit_track_costumes FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_costumes_update" ON orbit_track_costumes FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_track_costumes_delete" ON orbit_track_costumes FOR DELETE
  USING ((select auth.role()) = 'authenticated');

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE TRIGGER orbit_people_updated_at
  BEFORE UPDATE ON orbit_people
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orbit_releases_updated_at
  BEFORE UPDATE ON orbit_releases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orbit_tracks_updated_at
  BEFORE UPDATE ON orbit_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orbit_track_formations_updated_at
  BEFORE UPDATE ON orbit_track_formations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orbit_track_mvs_updated_at
  BEFORE UPDATE ON orbit_track_mvs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
