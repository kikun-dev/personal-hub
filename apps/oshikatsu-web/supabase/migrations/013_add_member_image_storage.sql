-- ============================================================
-- メンバープロフィール画像 Storage
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-images',
  'member-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "member_images_insert" ON storage.objects;
CREATE POLICY "member_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'member-images');

DROP POLICY IF EXISTS "member_images_update" ON storage.objects;
CREATE POLICY "member_images_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'member-images')
WITH CHECK (bucket_id = 'member-images');

DROP POLICY IF EXISTS "member_images_delete" ON storage.objects;
CREATE POLICY "member_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'member-images');
