-- ============================================================
-- リリース種別に best / compilation を追加
-- ------------------------------------------------------------
-- ベストアルバム・コンピレーションなど、ナンバリングを持たない
-- アルバム系の作品を登録できるようにする。
-- これらは numbering を持たない（digital_single / other と同じ扱い）。
-- ============================================================

-- release_type の許容値を拡張
ALTER TABLE public.orbit_releases
  DROP CONSTRAINT IF EXISTS orbit_releases_release_type_check;

ALTER TABLE public.orbit_releases
  ADD CONSTRAINT orbit_releases_release_type_check
  CHECK (
    release_type IN (
      'single',
      'album',
      'best',
      'compilation',
      'digital_single',
      'other'
    )
  );

-- numbering ルール: single/album のみ必須、それ以外（best/compilation 含む）は NULL
ALTER TABLE public.orbit_releases
  DROP CONSTRAINT IF EXISTS orbit_releases_numbering_rule;

ALTER TABLE public.orbit_releases
  ADD CONSTRAINT orbit_releases_numbering_rule CHECK (
    (
      release_type IN ('single', 'album')
      AND numbering IS NOT NULL
    ) OR (
      release_type IN ('best', 'compilation', 'digital_single', 'other')
      AND numbering IS NULL
    )
  );
