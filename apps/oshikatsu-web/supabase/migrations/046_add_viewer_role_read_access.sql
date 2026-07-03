-- ============================================================
-- 046: viewer ロールに閲覧のみを許可する
-- ------------------------------------------------------------
-- 045 で admin ロール限定にした Orbit の RLS を、
-- 「閲覧は admin/viewer 両方、書き込みは admin のみ」に緩和する。
-- INSERT/UPDATE/DELETE ポリシーは 045 のまま変更しない。
-- Issue #221
-- ============================================================

-- ============================================================
-- (a) 閲覧ロール判定関数
-- ------------------------------------------------------------
-- is_orbit_admin() と同形式。role が 'admin' または 'viewer' なら true。
-- 書き込み可否の判定は引き続き is_orbit_admin() が担い、本関数は
-- SELECT ポリシーでのみ使用する。
-- search_path = '' は規約（005_fix_rpc_search_path.sql 参照）。
-- (select ...) 形式にすることで 008 の initplan 最適化と整合させる。
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_orbit_read_role()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'viewer')
$$;

-- ポリシーは TO 句を付けないため anon ロールでも評価される。
-- anon に EXECUTE が無い環境では権限エラーになり得るため明示的に付与する
-- （anon は関数が false を返すことで安全に拒否される）。
GRANT EXECUTE ON FUNCTION public.has_orbit_read_role() TO anon, authenticated;

-- ============================================================
-- (b) public スキーマの orbit_* テーブルの SELECT ポリシーのみ置き換え
-- ------------------------------------------------------------
-- 045 は標準4ポリシー（<table>_select/_insert/_update/_delete）を
-- 全て DROP してから作り直す方式だったが、本 migration では
-- 書き込み系（_insert/_update/_delete）はそのまま残し、
-- 045 が付けた命名規則 `<table>_select` に一致するポリシーだけを
-- DROP → CREATE で置き換える。
-- migration 履歴から静的に列挙するとドリフトの危険があるため、
-- 045 同様 pg_tables から動的に対象テーブルを取得する。
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'orbit_%'
    ORDER BY tablename
  LOOP
    -- <table>_select ポリシーのみを対象にする（_insert/_update/_delete には触れない）
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select', tbl);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING ((select public.has_orbit_read_role()))',
      tbl || '_select', tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- (c) storage.objects について
-- ------------------------------------------------------------
-- member-images / release-images / track-costume-images の3バケットは
-- migration 013/020 で public = true として作成されており、
-- 045 の (d) で明言している通り「バケットは public 設定のため
-- SELECT ポリシーは不要」（public バケットの読み取りは Storage の
-- 公開エンドポイント経由で RLS を通らない）。
-- 実際、013/014/020/022/045 のいずれにも storage.objects の
-- SELECT ポリシーは存在しない。
-- そのため viewer 導入によっても書き換える SELECT ポリシーは無く、
-- 画像の閲覧は admin/viewer に関わらず従来通り可能（public バケットの
-- 仕様上、そもそも認可の対象外）。
-- 書き込み系ポリシー（*_insert/_update/_delete）は 045 のまま
-- is_orbit_admin() 限定を維持し、本 migration では変更しない。
-- ============================================================

-- ============================================================
-- ロールバック方針
-- ------------------------------------------------------------
-- 1. orbit_* の <table>_select ポリシーを 045 と同じ定義
--    （USING ((select public.is_orbit_admin()))）で DROP → CREATE し直す
-- 2. public.has_orbit_read_role() を DROP FUNCTION する
--    （GRANT は関数削除時に自動的に失効する）
-- 3. storage.objects は本 migration で変更していないため作業不要
-- これにより 045 適用直後の状態（admin 限定）に復帰する。
-- ============================================================
