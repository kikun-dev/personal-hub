-- ============================================================
-- 045: RLS をオーナー限定アクセス（admin ロール）に変更する
-- ------------------------------------------------------------
-- 多層防御として、認証済みユーザー全員から
-- app_metadata.role = 'admin' を持つユーザー（オーナー）のみに制限する。
-- サインアップは OFF 設定済みのため既存ユーザー = オーナーが前提。
-- Issue #213
-- ============================================================

-- ============================================================
-- (a) ロール判定関数
-- ------------------------------------------------------------
-- ロール名のハードコードをここに集約し、将来の変更に備える。
-- search_path = '' は規約（005_fix_rpc_search_path.sql 参照）。
-- (select ...) 形式にすることで 008 の initplan 最適化と整合させる。
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_orbit_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

-- ポリシーは TO 句を付けないため anon ロールでも評価される。
-- anon に EXECUTE が無い環境では権限エラーになり得るため明示的に付与する
-- （anon は関数が false を返すことで安全に拒否される）。
GRANT EXECUTE ON FUNCTION public.is_orbit_admin() TO anon, authenticated;

-- ============================================================
-- (b) 既存ユーザーへの admin ロール backfill
-- ------------------------------------------------------------
-- サインアップは OFF、既存ユーザー = オーナーのみが前提のため
-- 全ユーザーに admin ロールを付与する。
-- 本番環境で新規ユーザーが増えた場合は手動で付与が必要。
-- ============================================================
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb;

-- ============================================================
-- (c) public スキーマの orbit_* テーブルのポリシー一括置き換え
-- ------------------------------------------------------------
-- migration 履歴から静的に列挙するとドリフトの危険があるため、
-- pg_catalog から動的に処理する。
-- 各テーブルに標準4ポリシーを is_orbit_admin() で再作成する。
-- ============================================================
DO $$
DECLARE
  tbl  TEXT;
  pol  TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'orbit_%'
    ORDER BY tablename
  LOOP
    -- 既存ポリシーを全て DROP
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
    END LOOP;

    -- RLS を冪等に有効化
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- 標準4ポリシーを admin ロールで作成
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING ((select public.is_orbit_admin()))',
      tbl || '_select', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK ((select public.is_orbit_admin()))',
      tbl || '_insert', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING ((select public.is_orbit_admin())) WITH CHECK ((select public.is_orbit_admin()))',
      tbl || '_update', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING ((select public.is_orbit_admin()))',
      tbl || '_delete', tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- (d) storage.objects のポリシー置き換え
-- ------------------------------------------------------------
-- bucket_id / name prefix 条件という固有条件があるため、
-- 動的置換せず明示的に DROP → CREATE で書き直す。
-- TO authenticated は維持し、USING/WITH CHECK に is_orbit_admin() を AND 追加する。
-- バケットは public 設定のため SELECT ポリシーは不要。
-- ============================================================

-- member-images バケット（migration 013/014 で定義）
DROP POLICY IF EXISTS "member_images_insert" ON storage.objects;
CREATE POLICY "member_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'member-images'
  AND name LIKE 'members/%'
  AND (select public.is_orbit_admin())
);

DROP POLICY IF EXISTS "member_images_update" ON storage.objects;
CREATE POLICY "member_images_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'member-images'
  AND name LIKE 'members/%'
  AND (select public.is_orbit_admin())
)
WITH CHECK (
  bucket_id = 'member-images'
  AND name LIKE 'members/%'
  AND (select public.is_orbit_admin())
);

DROP POLICY IF EXISTS "member_images_delete" ON storage.objects;
CREATE POLICY "member_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'member-images'
  AND name LIKE 'members/%'
  AND (select public.is_orbit_admin())
);

-- release-images バケット（migration 020/022 で定義）
DROP POLICY IF EXISTS "release_images_insert" ON storage.objects;
CREATE POLICY "release_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'release-images'
  AND name LIKE 'releases/%'
  AND (select public.is_orbit_admin())
);

DROP POLICY IF EXISTS "release_images_update" ON storage.objects;
CREATE POLICY "release_images_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'release-images'
  AND name LIKE 'releases/%'
  AND (select public.is_orbit_admin())
)
WITH CHECK (
  bucket_id = 'release-images'
  AND name LIKE 'releases/%'
  AND (select public.is_orbit_admin())
);

DROP POLICY IF EXISTS "release_images_delete" ON storage.objects;
CREATE POLICY "release_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'release-images'
  AND name LIKE 'releases/%'
  AND (select public.is_orbit_admin())
);

-- track-costume-images バケット（migration 020/022 で定義）
DROP POLICY IF EXISTS "track_costume_images_insert" ON storage.objects;
CREATE POLICY "track_costume_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'track-costume-images'
  AND name LIKE 'costumes/%'
  AND (select public.is_orbit_admin())
);

DROP POLICY IF EXISTS "track_costume_images_update" ON storage.objects;
CREATE POLICY "track_costume_images_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'track-costume-images'
  AND name LIKE 'costumes/%'
  AND (select public.is_orbit_admin())
)
WITH CHECK (
  bucket_id = 'track-costume-images'
  AND name LIKE 'costumes/%'
  AND (select public.is_orbit_admin())
);

DROP POLICY IF EXISTS "track_costume_images_delete" ON storage.objects;
CREATE POLICY "track_costume_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'track-costume-images'
  AND name LIKE 'costumes/%'
  AND (select public.is_orbit_admin())
);
