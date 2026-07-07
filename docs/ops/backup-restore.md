# DB バックアップと復元

Supabase プロジェクト（oshikatsu-web / household-web で共有）の DB を日次でダンプし、
S3 互換の外部ストレージへ保存する運用手順。再入力不可能な個人データ
（参戦記録・聖地スポット・写真メタ・Wiki 等）の保全が目的。

設計判断は Issue #321 / `docs/orbit-roadmap.md` Phase 4 P1-1 を参照。
ワークフロー本体は `.github/workflows/backup-db.yml`。

## 全体像

- **いつ**: GitHub Actions の日次 cron（03:00 JST）+ 手動実行（`workflow_dispatch`）
- **何を**: `supabase db dump` を **roles / schema / data / auth_data** の4ファイルに分けて取得し、
  1つの tar.gz にまとめる（`supabase db dump` はデフォルトでスキーマのみのため、データは
  `--data-only` で別途取得する。Supabase 公式のバックアップ手順に準拠）
  - `roles.sql` … クラスタロール（`--role-only`）
  - `schema.sql` … public スキーマ定義
  - `data.sql` … public データ（`--data-only --use-copy --schema public`）
  - `auth_data.sql` … auth スキーマのデータ（`--data-only --schema auth`）。
    参戦記録（`orbit_live_attendances`）が `auth.users` を FK 参照するため、別プロジェクトへ
    復元しても FK を満たせるよう含める
- **どこへ**: S3 互換ストレージ（Cloudflare R2 または Backblaze B2 の無料枠）の非公開バケット
- **世代**: オブジェクトキー `backups/YYYY/MM/orbit-YYYYMMDD.tar.gz`（日次で1世代ずつ）
- **暗号化**: バケット非公開 + ストレージ側の保存時暗号化 + 転送時 HTTPS
  （GPG 等の追加暗号化はしない。鍵紛失で復元不能になり保全目的と矛盾するため。auth_data.sql は
  認証情報を含むため、バケットのアクセス制御で守る）

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
| `SUPABASE_DB_URL` | IPv4 session pooler の接続文字列（下記） |
| `BACKUP_S3_ACCESS_KEY_ID` | ストレージのアクセスキー ID |
| `BACKUP_S3_SECRET_ACCESS_KEY` | ストレージのシークレットアクセスキー |
| `BACKUP_S3_ENDPOINT` | S3 互換エンドポイント URL |
| `BACKUP_S3_BUCKET` | バケット名 |
| `BACKUP_S3_REGION` | （任意）R2 は未設定で `auto`。B2 等は発行時のリージョン |

`SUPABASE_DB_URL` は Supabase ダッシュボード → Project Settings → Database →
Connection string → **Session pooler** から取得する。GitHub Actions の hosted runner は
Supabase direct connection の IPv6 に到達できないため、IPv4 対応の session pooler を使う。
`pg_dump` / backup 用途では direct connection が第一候補だが、IPv4 add-on なしで direct connection を
使えない場合は session pooler を代替にする。形式:

```
postgresql://postgres.<project-ref>:<db-password>@<region>.pooler.supabase.com:5432/postgres
```

> Secrets はリポジトリにも Actions のログにも出力しない（ワークフローは値の存在チェックのみ行う）。

### 3. 動作確認（手動実行）

Actions タブ → 「Backup - database」→ Run workflow で手動実行し、成功することを確認する。
成功後、ストレージのバケットに `backups/YYYY/MM/orbit-YYYYMMDD.tar.gz` が作られていることを確認する。

### 4. 失敗通知を有効にする

バックアップの失敗に気づけるよう、GitHub の通知設定でワークフロー失敗の通知を有効にしておく:

- 個人設定 → Settings → Notifications → Actions → 「Failed workflows only」以上を有効化
  （メール or Web 通知）

## CLI バージョンの更新

ワークフローは `supabase/setup-cli` の `version` を固定している（`db dump` の挙動が日次で
勝手に変わらないようにするため）。上げるときは依存更新 PR と同じ扱いで、手動実行 + 復元試験で
問題ないことを確認してから `version:` を書き換える。初回検証時のバージョンは下の記録表に残す。

## 復元手順

原則として、いきなり本番 DB に流し込まない。まずローカル Supabase または別プロジェクトへ復元し、
バックアップの中身と件数を確認してから、本番復旧が必要か判断する。

1. ストレージから対象日のアーカイブを取得して展開する:

   ```bash
   export AWS_ACCESS_KEY_ID="<backup access key id>"
   export AWS_SECRET_ACCESS_KEY="<backup secret access key>"
   export AWS_DEFAULT_REGION="auto"  # R2 の場合。B2 等は発行時のリージョン

   BACKUP_S3_ENDPOINT="https://<accountid>.r2.cloudflarestorage.com"
   BACKUP_S3_BUCKET="<bucket>"
   BACKUP_KEY="backups/2026/07/orbit-20260707.tar.gz"

   aws s3 cp "s3://${BACKUP_S3_BUCKET}/${BACKUP_KEY}" . \
     --endpoint-url "${BACKUP_S3_ENDPOINT}"
   tar xzf orbit-20260707.tar.gz   # roles.sql / schema.sql / data.sql / auth_data.sql
   ```

2. 復元先に応じて流し込む:

   - **本番 DB の復旧（同一プロジェクト）**: スキーマと auth.users は既存のため、`data.sql` の
     流し込みで足りる（`psql "<direct connection URL>" -f data.sql`）。**上書き復旧は最終手段**。
     まず下記の別プロジェクト/ローカルへ復元して内容を確認してから判断する
   - **別プロジェクト / ローカル（#322 の Supabase ローカル環境）への復元**: FK を満たすため
     次の順で流す。参戦記録の `user_id`（`auth.users` 参照）を復元するには `auth_data.sql` を
     `data.sql` より先に流す必要がある:

     ```bash
     DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"  # ローカルの例
     # roles.sql は Supabase プロジェクト間・ローカルでは既存ロールと衝突し得るため通常は不要。
     # 空クラスタへ移す等でロールが無い場合のみ psql -f roles.sql を先に実行する。
     psql "$DB" -v ON_ERROR_STOP=1 -f schema.sql
     psql "$DB" -v ON_ERROR_STOP=1 -f auth_data.sql   # 参戦記録の FK（auth.users）用
     psql "$DB" -v ON_ERROR_STOP=1 -f data.sql
     ```

3. 主要テーブルの件数を確認する:

   ```bash
   psql "$DB" -v ON_ERROR_STOP=1 <<'SQL'
   select 'auth.users' as table_name, count(*) as rows from auth.users
   union all
   select 'orbit_groups', count(*) from public.orbit_groups
   union all
   select 'orbit_members', count(*) from public.orbit_members
   union all
   select 'orbit_live_attendances', count(*) from public.orbit_live_attendances
   union all
   select 'orbit_spots', count(*) from public.orbit_spots
   union all
   select 'orbit_wiki_pages', count(*) from public.orbit_wiki_pages
   order by table_name;
   SQL
   ```

### ローカル Supabase で復元試験する場合

Issue #321 の完了条件として復元試験を行う場合は、`apps/oshikatsu-web` のローカル Supabase を
復元先に使う。日次バックアップ workflow には復元処理を入れず、必要なときに手元で実行する。

```bash
cd apps/oshikatsu-web
supabase start
cd ../..

# 上の「復元手順」でアーカイブ取得・展開を済ませてから実行する
DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
psql "$DB" -v ON_ERROR_STOP=1 -f schema.sql
psql "$DB" -v ON_ERROR_STOP=1 -f auth_data.sql
psql "$DB" -v ON_ERROR_STOP=1 -f data.sql

# 件数確認後、不要ならローカル環境を破棄
cd apps/oshikatsu-web
supabase stop --no-backup
```

> 補足: public データ（グループ / メンバー / 楽曲 / スポット / Wiki 等）は auth 非依存のため、
> `auth_data.sql` を流さなくても `schema.sql` → `data.sql` だけで復元・検証できる
> （参戦記録の行のみ FK で失敗する）。まず public データで復元試験し、参戦記録まで確認したい
> 場合に `auth_data.sql` を加える、と段階的に進めてよい。
>
> 画像・写真の**実体**（Supabase Storage）はバックアップ対象外（Non-goal）。復元後は
> `image_path` は残るが実体が無い状態になる。実体の保全が必要になったら別 Issue で対応する。

## 復元試験の記録

「バックアップが実際に復元できる」ことを確認した記録を残す（Issue #321 の完了条件）。

| 実施日 | ダンプ日 | 復元先 | CLI バージョン | 所要時間 | 結果 | 注意点 |
|---|---|---|---|---|---|---|
| 2026-07-08 | 2026-07-07 | ローカル Supabase（一時 project_id: `personal-hub-restore`、DB port 55422） | 2.109.1 | 約10分（初回 Docker image 取得を含む） | 成功 | `schema.sql` → `auth_data.sql` → public data の順に復元。主要件数: `auth.users` 2 / `orbit_groups` 6 / `orbit_members` 201 / `orbit_live_attendances` 31 / `orbit_spots` 2 / `orbit_wiki_pages` 1。試験時点の `data.sql` は auth/storage も含んでいたため、#330 で `--schema public` を追加 |
