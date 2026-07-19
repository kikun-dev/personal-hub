-- ============================================================
-- perf計測用ローカル専用スクリプト: PostgREST 接続（role: authenticator）へ
-- auto_explain を仕込む
-- ------------------------------------------------------------
-- Issue #383。ローカル Supabase 専用（本番へは絶対に適用しない）。
--
-- PostgREST は `authenticator` ロールで DB に接続し、リクエストごとに
-- JWT の role（anon/authenticated/service_role）へ SET ROLE する。
-- ALTER ROLE ... SET は「そのロールで新規接続したセッション」に対して
-- 有効になる設定なので、適用後に PostgREST コンテナを再起動して
-- 接続プールを作り直す必要がある（既存コネクションには反映されない）。
--
-- 適用手順:
--   1. docker exec -i supabase_db_oshikatsu-web psql -U supabase_admin -d postgres \
--        -v ON_ERROR_STOP=1 < scripts/perf/setup-auto-explain.sql
--      ※ `-U postgres` では失敗する（ERROR: permission denied to set
--      parameter "session_preload_libraries"）。ローカル Supabase では
--      `postgres` ロールは rolsuper=false で、実際の superuser は
--      `supabase_admin`。session_preload_libraries は GUC context が
--      'superuser' のため、ALTER ROLE ... SET も superuser 権限で
--      実行する必要がある（実機で確認済み）。
--   2. コンテナ名を確認: docker ps --format '{{.Names}}' | grep rest
--   3. docker restart supabase_rest_oshikatsu-web
--   4. 以降、driver が投げるクエリの実行計画は
--        docker logs supabase_db_oshikatsu-web
--      に (auto_explain) として出力される（Query Text 付き）。
--
-- ロールバック（計測終了後、元に戻したい場合）:
--   ALTER ROLE authenticator RESET session_preload_libraries;
--   ALTER ROLE authenticator RESET auto_explain.log_min_duration;
--   ALTER ROLE authenticator RESET auto_explain.log_analyze;
--   ALTER ROLE authenticator RESET auto_explain.log_buffers;
--   ALTER ROLE authenticator RESET auto_explain.log_nested_statements;
--   ALTER ROLE authenticator RESET auto_explain.log_timing;
--   ALTER ROLE authenticator RESET auto_explain.log_verbose;
--   その後 `docker restart supabase_rest_oshikatsu-web` で反映。
--   （どのみち次の `npx supabase db reset` でロールごと作り直されるため、
--   通常は明示的なロールバックをしなくても次の reset で消える）
-- ============================================================

ALTER ROLE authenticator SET session_preload_libraries = 'auto_explain';
ALTER ROLE authenticator SET auto_explain.log_min_duration = 0;
ALTER ROLE authenticator SET auto_explain.log_analyze = on;
ALTER ROLE authenticator SET auto_explain.log_buffers = on;
ALTER ROLE authenticator SET auto_explain.log_nested_statements = on;
ALTER ROLE authenticator SET auto_explain.log_timing = on;
ALTER ROLE authenticator SET auto_explain.log_verbose = on;
