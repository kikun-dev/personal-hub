-- ============================================================
-- 055: 聖地巡礼マップのテーブル追加（#286 / ADR 0010）
-- ------------------------------------------------------------
-- 目的:
--   グループの活動（MV撮影、番組ロケ、ヒット祈願など）で訪れた場所を
--   「スポット」として登録し、地図表示・多軸検索できるようにする。
--   ADR 0010 の4テーブル構成:
--     - orbit_spots                  … スポット本体（名称・座標・カテゴリ等）
--     - orbit_spot_appearances       … 出来事（何で訪れたか。既存テーブルへのFK）
--     - orbit_spot_appearance_members… 出来事×メンバー（誰が）
--     - orbit_spot_photos            … スポット写真（Storage object path を保持。
--                                       アップロードUIとバケットは Phase 2）
--
-- 設計メモ:
--   - 座標は latitude / longitude の DOUBLE PRECISION 列で保持する。
--     近隣検索は当面クライアント側（地図パン + 全件ピン）で行い、
--     PostGIS 化は件数が増えてから検討する（ADR 0010 Decision 3）
--   - appearances の出典FK（track/video/event/live）は source_type に応じて
--     いずれか1つを使う想定だが、DB では NULL 許容の並列カラムとし、
--     整合性はアプリ層（validateSpot）で担保する。出典の実体が削除されても
--     記録自体は残したいため ON DELETE SET NULL とする
--   - member_id は既存パターン（020/050 の formation members）に合わせ
--     ON DELETE RESTRICT とする
--
-- ロールバック方針:
--   DROP TABLE orbit_spot_photos;
--   DROP TABLE orbit_spot_appearance_members;
--   DROP TABLE orbit_spot_appearances;
--   DROP TABLE orbit_spots;
--   （ポリシー・インデックスはテーブル削除で同時に消える）
-- ============================================================

-- ============================================================
-- (1) orbit_spots — スポット本体
-- ============================================================
CREATE TABLE orbit_spots (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL
    CHECK (category IN ('mv_location', 'show_location', 'hit_kigan', 'live_related', 'other')),
  description      TEXT,
  latitude         DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude        DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  address          TEXT,
  prefecture       TEXT,
  google_place_id  TEXT,
  google_maps_url  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_spots_category ON orbit_spots (category);
CREATE INDEX idx_orbit_spots_prefecture ON orbit_spots (prefecture);

-- ============================================================
-- (2) orbit_spot_appearances — 出来事（何で訪れたか）
-- ============================================================
CREATE TABLE orbit_spot_appearances (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id      UUID NOT NULL REFERENCES orbit_spots(id) ON DELETE CASCADE,
  source_type  TEXT NOT NULL
    CHECK (source_type IN ('mv', 'video', 'event', 'live', 'other')),
  track_id     UUID REFERENCES orbit_tracks(id) ON DELETE SET NULL,
  video_id     UUID REFERENCES orbit_track_videos(id) ON DELETE SET NULL,
  event_id     UUID REFERENCES orbit_events(id) ON DELETE SET NULL,
  live_id      UUID REFERENCES orbit_lives(id) ON DELETE SET NULL,
  series_name  TEXT,
  appeared_on  DATE,
  note         TEXT,
  link_url     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_spot_appearances_spot_id ON orbit_spot_appearances (spot_id);
CREATE INDEX idx_orbit_spot_appearances_track_id ON orbit_spot_appearances (track_id);
CREATE INDEX idx_orbit_spot_appearances_video_id ON orbit_spot_appearances (video_id);
CREATE INDEX idx_orbit_spot_appearances_event_id ON orbit_spot_appearances (event_id);
CREATE INDEX idx_orbit_spot_appearances_live_id ON orbit_spot_appearances (live_id);

-- ============================================================
-- (3) orbit_spot_appearance_members — 出来事×メンバー（誰が）
-- ============================================================
CREATE TABLE orbit_spot_appearance_members (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appearance_id  UUID NOT NULL REFERENCES orbit_spot_appearances(id) ON DELETE CASCADE,
  member_id      UUID NOT NULL REFERENCES orbit_members(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orbit_spot_appearance_members_unique
  ON orbit_spot_appearance_members (appearance_id, member_id);
CREATE INDEX idx_orbit_spot_appearance_members_member_id
  ON orbit_spot_appearance_members (member_id);

-- ============================================================
-- (4) orbit_spot_photos — スポット写真
-- Storage バケットとアップロードUIは Phase 2 で追加する。
-- image_path にはメンバー画像（orbit_members.image_url）と同様に
-- Storage の object path を保持する。
-- ============================================================
CREATE TABLE orbit_spot_photos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id     UUID NOT NULL REFERENCES orbit_spots(id) ON DELETE CASCADE,
  image_path  TEXT NOT NULL,
  caption     TEXT,
  sort_order  INT NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_spot_photos_spot_id ON orbit_spot_photos (spot_id);

-- ============================================================
-- RLS: グローバルテーブルの標準パターン（045/046）。
-- select = has_orbit_read_role() / insert・update・delete = is_orbit_admin()
-- ============================================================
ALTER TABLE orbit_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_spot_appearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_spot_appearance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_spot_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_spots_select" ON orbit_spots FOR SELECT
  USING ((select public.has_orbit_read_role()));
CREATE POLICY "orbit_spots_insert" ON orbit_spots FOR INSERT
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_spots_update" ON orbit_spots FOR UPDATE
  USING ((select public.is_orbit_admin()))
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_spots_delete" ON orbit_spots FOR DELETE
  USING ((select public.is_orbit_admin()));

CREATE POLICY "orbit_spot_appearances_select" ON orbit_spot_appearances FOR SELECT
  USING ((select public.has_orbit_read_role()));
CREATE POLICY "orbit_spot_appearances_insert" ON orbit_spot_appearances FOR INSERT
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_spot_appearances_update" ON orbit_spot_appearances FOR UPDATE
  USING ((select public.is_orbit_admin()))
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_spot_appearances_delete" ON orbit_spot_appearances FOR DELETE
  USING ((select public.is_orbit_admin()));

CREATE POLICY "orbit_spot_appearance_members_select" ON orbit_spot_appearance_members FOR SELECT
  USING ((select public.has_orbit_read_role()));
CREATE POLICY "orbit_spot_appearance_members_insert" ON orbit_spot_appearance_members FOR INSERT
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_spot_appearance_members_update" ON orbit_spot_appearance_members FOR UPDATE
  USING ((select public.is_orbit_admin()))
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_spot_appearance_members_delete" ON orbit_spot_appearance_members FOR DELETE
  USING ((select public.is_orbit_admin()));

CREATE POLICY "orbit_spot_photos_select" ON orbit_spot_photos FOR SELECT
  USING ((select public.has_orbit_read_role()));
CREATE POLICY "orbit_spot_photos_insert" ON orbit_spot_photos FOR INSERT
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_spot_photos_update" ON orbit_spot_photos FOR UPDATE
  USING ((select public.is_orbit_admin()))
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_spot_photos_delete" ON orbit_spot_photos FOR DELETE
  USING ((select public.is_orbit_admin()));
