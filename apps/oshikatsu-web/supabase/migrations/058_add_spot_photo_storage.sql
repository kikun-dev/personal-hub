-- ============================================================
-- 058: スポット写真 Storage（#293）
-- ------------------------------------------------------------
-- 目的:
--   orbit_spot_photos（055 で作成済み）の image_path が指す実体を置く
--   Storage バケットを追加する。member-images（013/014）と同構成で、
--   書き込みポリシーは 045 の現行慣行（TO authenticated + bucket_id +
--   name prefix + is_orbit_admin()）に合わせる。
--   バケットは public のため SELECT ポリシーは不要（045 と同方針）。
--
-- ロールバック方針:
--   DROP POLICY IF EXISTS "spot_photos_insert" ON storage.objects;
--   DROP POLICY IF EXISTS "spot_photos_update" ON storage.objects;
--   DROP POLICY IF EXISTS "spot_photos_delete" ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'spot-photos';
--   （オブジェクトが残っていると bucket 削除に失敗するため、先に
--   storage.objects の該当行を削除する）
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'spot-photos',
  'spot-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "spot_photos_insert" ON storage.objects;
CREATE POLICY "spot_photos_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'spot-photos'
  AND name LIKE 'spots/%'
  AND (select public.is_orbit_admin())
);

DROP POLICY IF EXISTS "spot_photos_update" ON storage.objects;
CREATE POLICY "spot_photos_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'spot-photos'
  AND name LIKE 'spots/%'
  AND (select public.is_orbit_admin())
)
WITH CHECK (
  bucket_id = 'spot-photos'
  AND name LIKE 'spots/%'
  AND (select public.is_orbit_admin())
);

DROP POLICY IF EXISTS "spot_photos_delete" ON storage.objects;
CREATE POLICY "spot_photos_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'spot-photos'
  AND name LIKE 'spots/%'
  AND (select public.is_orbit_admin())
);
