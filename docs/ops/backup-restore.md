# DB バックアップと復元

Supabase プロジェクト（oshikatsu-web / household-web で共有）の DB を日次でダンプし、
S3 互換の外部ストレージへ保存する運用手順。再入力不可能な個人データ
（参戦記録・聖地スポット・写真メタ・Wiki 等）の保全が目的。

設計判断は Issue #321 / `docs/orbit-roadmap.md` Phase 4 P1-1 を参照。
ワークフロー本体は `.github/workflows/backup-db.yml`。

## 全体像

- **いつ**: GitHub Actions の日次 cron（03:00 JST）+ 手動実行（`workflow_dispatch`）
- **何を**: `supabase db dump`（スキーマ + データ）を gzip 圧縮
- **どこへ**: S3 互換ストレージ（Cloudflare R2 または Backblaze B2 の無料枠）の非公開バケット
- **世代**: オブジェクトキー `backups/YYYY/MM/orbit-YYYYMMDD.sql.gz`（日次で1世代ずつ）
- **暗号化**: バケット非公開 + ストレージ側の保存時暗号化 + 転送時 HTTPS
  （GPG 等の追加暗号化はしない。鍵紛失で復元不能になり保全目的と矛盾するため）

## セットアップ（初回のみ・手動作業）

### 1. ストレージのバケットを用意する

Cloudflare R2 の例（Backblaze B2 でも S3 互換なので同様）:

1. Cloudflare ダッシュボード → R2 → バケット作成（例: `personal-hub-db-backups`）。**Public access は無効のまま**
2. R2 → API トークン → アクセスキーを発行（Object Read & Write 権限）
3. エンドポイント URL を控える（`https://<accountid>.r2.cloudflarestorage.com`）

### 2. GitHub Secrets を登録する

リポジトリ → Settings → Secrets and variables → Actions → New repository secret で以下を登録:

| Secret 名 | 値 |
|---|---|
| `SUPABASE_DB_URL` | direct connection の接続文字列（下記） |
| `BACKUP_S3_ACCESS_KEY_ID` | ストレージのアクセスキー ID |
| `BACKUP_S3_SECRET_ACCESS_KEY` | ストレージのシークレットアクセスキー |
| `BACKUP_S3_ENDPOINT` | S3 互換エンドポイント URL |
| `BACKUP_S3_BUCKET` | バケット名 |
| `BACKUP_S3_REGION` | （任意）R2 は未設定で `auto`。B2 等は発行時のリージョン |

`SUPABASE_DB_URL` は Supabase ダッシュボード → Project Settings → Database →
Connection string → **URI（direct connection）** から取得する。形式:

```
postgresql://postgres:<db-password>@db.<project-ref>.supabase.co:5432/postgres
```

> Secrets はリポジトリにも Actions のログにも出力しない（ワークフローは値の存在チェックのみ行う）。

### 3. 動作確認（手動実行）

Actions タブ → 「Backup - database」→ Run workflow で手動実行し、成功することを確認する。
成功後、ストレージのバケットに `backups/YYYY/MM/orbit-YYYYMMDD.sql.gz` が作られていることを確認する。

### 4. 失敗通知を有効にする

バックアップの失敗に気づけるよう、GitHub の通知設定でワークフロー失敗の通知を有効にしておく:

- 個人設定 → Settings → Notifications → Actions → 「Failed workflows only」以上を有効化
  （メール or Web 通知）

## 復元手順

1. ストレージから対象日のダンプを取得して展開する:

   ```bash
   aws s3 cp "s3://<bucket>/backups/2026/07/orbit-20260707.sql.gz" . \
     --endpoint-url "<endpoint>"
   gunzip orbit-20260707.sql.gz
   ```

2. 復元先の DB へ流し込む（いずれか）:

   - **ローカル（#322 の Supabase ローカル環境が整っている場合、推奨）**:
     ```bash
     psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f orbit-20260707.sql
     ```
   - **新規 Supabase プロジェクト（本番と切り離して検証したい場合）**:
     ```bash
     psql "<新規プロジェクトの direct connection URL>" -f orbit-20260707.sql
     ```

3. 主要テーブルの件数を確認する（例: `select count(*) from orbit_live_attendances;`）。

> 本番 DB への上書き復元は最終手段。まずローカル or 別プロジェクトへ復元して内容を確認してから判断する。

## 復元試験の記録

「バックアップが実際に復元できる」ことを確認した記録を残す（Issue #321 の完了条件）。

| 実施日 | ダンプ日 | 復元先 | 所要時間 | 結果 | 注意点 |
|---|---|---|---|---|---|
| （未実施） | | | | | セットアップ後に1回実施する |
