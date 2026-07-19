-- ============================================================
-- perf計測用ローカル専用スクリプト: anon/authenticated/service_role への
-- テーブル権限を補完する
-- ------------------------------------------------------------
-- 背景（#383 で判明した既知の環境ギャップ）:
-- 本番の hosted Supabase プロジェクトはプロジェクト作成時に
-- `GRANT ... ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role`
-- 相当の基盤 GRANT をプラットフォーム側で自動的に用意する。一方、
-- ローカルの `npx supabase db reset` はリポジトリ内の migrations のみを
-- 再生するため、この基盤 GRANT が存在しない。結果として、
-- ローカルでは service_role キーであっても
-- `permission denied for table orbit_events` のように REST 経由の読み取りが
-- 全て失敗する（RLS 以前の GRANT 段階で拒否される。has_table_privilege() で確認済み）。
--
-- 本スクリプトは、この perf 計測基盤（driver が実 PostgREST 経由で
-- repository を実行する）を成立させるために、ローカル DB へ最小限の
-- 基盤 GRANT を補う。migrations には追加しない（本番はこの GRANT が
-- 既にあるため不要であり、なくても良い変更をわざわざ本番に持ち込まない）。
--
-- 適用: `npx supabase db reset` の直後、fixture 適用と同じタイミングで
-- 一度実行する（`docker exec -i ... psql ... < grant-local-roles.sql`）。
-- 何度実行しても安全（GRANT は冪等）。
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 今後 `db reset` のたびに本スクリプトを再実行する運用のため、
-- ALTER DEFAULT PRIVILEGES は必須ではないが、将来同一セッション内で
-- 追加オブジェクトを作るケースに備えて念のため設定しておく。
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
