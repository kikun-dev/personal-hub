# Supabase Performance Advisor 対応ログ

## 2026-03-06（PR #39）

対象PR: https://github.com/kikun-dev/personal-hub/pull/39

### 対応1: `auth_rls_initplan`（WARN）

- 内容: RLS ポリシー内の `auth.uid()` / `auth.role()` の直接呼び出しを、`(select auth.uid())` / `(select auth.role())` に変更
- 追加 migration:
  - `apps/household-web/supabase/migrations/004_optimize_rls_auth_calls.sql`
  - `apps/oshikatsu-web/supabase/migrations/008_optimize_rls_auth_calls.sql`
- 結果: SQL 実行後、Advisor で WARN 解消を確認

### 対応2: `unindexed_foreign_keys`（INFO）

- 内容: FK 制約列に不足していた index を追加
- 追加 migration:
  - `apps/household-web/supabase/migrations/005_add_missing_fk_indexes.sql`
  - `apps/oshikatsu-web/supabase/migrations/009_add_missing_fk_indexes.sql`
- 結果: SQL 実行後、Advisor で該当 INFO 解消を確認

### 保留: `unused_index`（INFO）

- 現時点では削除しない
- 理由: アクセス実績の少ない期間では未使用判定になりやすいため
- 方針: 利用状況が蓄積したタイミングで再評価する
