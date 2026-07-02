---
name: migration
description: Supabaseのmigrationファイルを追加する。「migration作って」「マイグレーション追加」「テーブル追加して」「RLS変更して」などのDB変更時に使う。採番→RLS/インデックス/RPCのチェックリスト適用→関連ドキュメント更新まで一括で行う。
argument-hint: "<DB変更の内容> [対象アプリ: oshikatsu-web(デフォルト) | household-web]"
---

# Supabase migration 追加

`apps/<app>/supabase/migrations/` に migration を追加する。デフォルト対象は oshikatsu-web。

## 手順

### 1. 採番と命名

- 次番号 = そのアプリの `migrations/` 内の**最大番号 + 1**（3桁ゼロ埋め）
- **欠番は再利用しない**（oshikatsu-web は 036 が欠番だが、そのままにする）
- `seeds/` は migrations とは**別採番**。データ投入は migration ではなく seeds に置く
- ファイル名: `NNN_snake_case_summary.sql`（例: `045_add_owner_role_rls.sql`）
- ファイル冒頭に目的をコメントで書く（既存 migration の `-- ====` 区切りスタイルに合わせる）

### 2. 内容チェックリスト（該当するものを必ず適用）

- **新規テーブル**:
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + 4操作分のポリシーを必ず付ける
  - ポリシーは既存パターンに合わせる（現状は `002_orbit_rls_policies.sql` の authenticated 統一。
    Issue #213 のオーナー限定化以降は、その時点の最新ポリシーパターンに合わせる）
  - `auth.*` 関数は `(select auth.role())` 形式で書く（`008_optimize_rls_auth_calls.sql` の最適化に合わせる）
- **外部キー追加**: FK 列にインデックスを付ける（`009` / `024` で欠落を後追い修正した経緯あり）
- **RPC 関数**: `SECURITY INVOKER` を基本とし、`set search_path = ''` を必ず指定する
  （`005_fix_rpc_search_path.sql` で後追い修正した経緯あり）
- **複数テーブルの一括更新**: アプリ側で逐次更新せず、トランザクション RPC にまとめる
  （`012` / `015` / `022` / `031` のパターン）
- **Storage**: バケットポリシーには bucket_id + object key prefix 制約を付ける（`014` のパターン）
- **破壊的変更（DROP / 型変更）**: ロールバック方針を PR の DB / Migration セクションに書けるよう整理しておく

### 3. 適用と検証

- ローカル適用: アプリディレクトリで `supabase db push`（または `supabase db reset` でシード込み再構築）
- 適用後、影響するアプリの typecheck / lint と、関連画面の手動確認を行う
- Issue #216（Supabase 生成型）導入後は、スキーマ変更のたびに型を再生成する
  （導入時に定義されるコマンドに従う。導入前は不要）

### 4. 関連ドキュメントの更新（該当する場合のみ）

- 新規テーブル・テーブル構成の変更 → `docs/ai/PROJECT.md` の「主要DBテーブル」リストを更新
- PR には `.github/PULL_REQUEST_TEMPLATE.md` の「DB / Migration」セクションを必ず記載
  （ファイル名・変更点・RLS/Policy 変更・Rollback 方針）

## 完了条件

- migration が正しい採番・命名で作成され、チェックリストの該当項目が適用されている
- ローカルで適用・動作確認済み（未適用ならその旨を明示）
- 関連ドキュメントが更新されている（該当する場合）
