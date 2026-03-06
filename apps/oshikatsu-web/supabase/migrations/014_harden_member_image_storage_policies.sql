-- ============================================================
-- メンバープロフィール画像 Storage policy 強化
-- ============================================================
-- 013 実行済み環境向けに、object key prefix 制約を追加する

DROP POLICY IF EXISTS "member_images_insert" ON storage.objects;
CREATE POLICY "member_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'member-images'
  AND name LIKE 'members/%'
);

DROP POLICY IF EXISTS "member_images_update" ON storage.objects;
CREATE POLICY "member_images_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'member-images'
  AND name LIKE 'members/%'
)
WITH CHECK (
  bucket_id = 'member-images'
  AND name LIKE 'members/%'
);

DROP POLICY IF EXISTS "member_images_delete" ON storage.objects;
CREATE POLICY "member_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'member-images'
  AND name LIKE 'members/%'
);
