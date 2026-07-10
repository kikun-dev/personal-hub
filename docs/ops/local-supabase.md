# Supabase ローカル環境

`supabase start`（Docker）で oshikatsu-web 用のローカル Supabase を立て、migration を
「ローカルで検証 → 本番へ push」するための手順。本番 DB への直あて（`db push` の失敗が
即本番障害）を避けることが目的（Issue #322 / ADR 0012）。

## 前提

- WSL2（Ubuntu）+ Docker（`docs/ai/PROJECT.md` §3 の開発環境）
- Supabase CLI（`npx supabase ...` でも可。CI は `2.109.1` に固定）
- 作業ディレクトリは `apps/oshikatsu-web`（`supabase/config.toml` がここにあり、
  migrations / seeds もここ基準で解決される）

## 起動と初期化

```bash
cd apps/oshikatsu-web

# ローカルスタック（DB / Auth / Storage / Studio 等）を起動
supabase start

# 全 migration + 全 seed をクリーンな状態から適用する
supabase db reset
```

- `supabase start` の出力に、ローカルの API URL / anon key / DB 接続文字列が表示される。
  アプリをローカル DB に向ける場合は `apps/oshikatsu-web/.env.local` の
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` をローカルの値にする
  （本番と切り替えるときは戻す。`.env.local` は gitignore 済み）
- seed は `config.toml` の `[db.seed].sql_paths = ["./seeds/*.sql"]` により
  `seeds/` 全件がファイル名の辞書順（= 採番順）で適用される
- Studio（DB の GUI）は既定で http://127.0.0.1:54323

停止:

```bash
supabase stop          # データは次回 start まで保持
supabase stop --no-backup   # データも破棄してクリーンにする
```

## migration の追加フロー（本番直あての回避）

`/migration`（`.claude/skills/migration` / `.agents/skills/migration`）で migration を作ったあと:

1. **ローカルで検証**: `supabase db reset` を実行し、新しい migration を含む全件が
   エラーなく適用されることを確認する（CI の `db-verify` ジョブと同じ検証）
2. **生成型を更新**: スキーマを変えたらローカル DB から型を再生成する

   ```bash
   # apps/oshikatsu-web で実行（config.toml があるため）
   supabase gen types typescript --local > ../../packages/supabase/src/database.types.ts
   ```

   （本番反映後に本番から再生成しても結果は同じ。従来の
   `pnpm --filter @personal-hub/supabase gen:types` は本番 project から生成する）
3. **本番へ反映**: `supabase db push`（**ユーザーが実行**。本番への書き込みのため）。
   反映後に `supabase migration list` でローカル / 本番の適用状況が揃っていることを確認する

## 本番との履歴整合

- ローカル DB は使い捨て（`db reset` で毎回作り直す）ため、履歴のズレを気にする必要はない
- 本番は `supabase migration list` でローカルとの差分を確認する。既存の本番には
  001〜061 が適用済みのため、初回に本番とローカルの履歴を突き合わせる場合は
  `supabase migration list --linked` で状態を確認する

## CI での自動検証

`.github/workflows/db-verify.yml` が、`apps/oshikatsu-web/supabase/**` の変更を含む PR で
`supabase start` → `supabase db reset` を実行し、全 migration + seed が通ることを検証する。
これによりマージ前に「本番へ push しても適用できる」ことが保証される。

## 補足

- household-web はローカル環境（config.toml）を整備していない（Issue #322 の Non-goal）。
  必要になれば同じ仕組みを `apps/household-web/supabase/` に用意する
- `#321` の DB 復元試験は、このローカル環境を復元先に使うと手軽。
  `docs/ops/backup-restore.md` の復元手順に従い、必要に応じて
  `schema.sql` → `auth_data.sql` → `data.sql` の順で流し込む
