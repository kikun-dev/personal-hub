# ADR 0012: Supabase ローカル環境（Docker）の導入と migration 検証フロー

## Status

Accepted

## Context（背景）

主要機能が概ね揃い、「使いながら育てる」運用フェーズに移行した（`docs/orbit-roadmap.md` Phase 4）。
これまで migration は本番 DB へ `supabase db push` で直接適用しており、次の運用リスクがあった。

- migration 適用の失敗が本番障害に直結する。実際 #309（event RPC）・#313（Wiki）では
  「適用前にデプロイすると壊れる」ため、PR 側で適用順序の調整が毎回必要だった
- AI（Claude/Codex）が migration・RLS ポリシーを**実際に実行して検証できず**、
  生成型の手動同期や机上検証で代替してきた
- 破壊的な検証を本番データに対して行うしかなかった

`docs/ai/PROJECT.md` §9 の非目標「Docker 導入」は「設計完了後に検討」としていた。
その前提が満たされたため、方針転換して検討した（Issue #322）。

### 選択肢

- 案A: Supabase CLI のローカルスタック（`supabase start`、Docker Compose ベース。公式）
- 案B: 素の Postgres コンテナ + 手動で RLS/Auth を模す

案B は本番の RLS/Auth/Storage を再現できず、`is_orbit_admin()` 等のポリシーをローカルで
検証できない。案A は本番と同じ構成を Docker で再現でき、既存の `config.toml`
（`apps/oshikatsu-web/supabase/`）をそのまま使える。

## Decision（決定）

### 1. Supabase CLI のローカルスタック（案A）を導入する

- `supabase start` でローカル DB / Auth / Storage を起動し、`supabase db reset` で
  全 migration + seed をクリーンな状態から適用する
- 実行手順は `docs/ops/local-supabase.md` に集約する

### 2. migration は「ローカルで検証 → 本番へ push」のフローに変更する

- `/migration` スキルの「適用と検証」を、ローカルの `supabase db reset` で検証してから
  本番反映（`supabase db push` はユーザーが実行）に改める（`.claude` / `.codex` 両方の共用スキル）
- 生成型はローカル DB から `supabase gen types typescript --local` で再生成できる
  （本番反映後の `pnpm --filter @personal-hub/supabase gen:types` と結果は同じ）

### 3. CI で migration の適用可能性を自動検証する

- `.github/workflows/db-verify.yml` が `apps/oshikatsu-web/supabase/**` を含む PR で
  `supabase start` → `supabase db reset` を実行し、全 migration + seed が通ることを検証する
- これによりマージ前に「本番へ push しても適用できる」ことを保証する

### 4. seed の登録を glob に統一する

- `config.toml` の `[db.seed].sql_paths` を明示列挙から `["./seeds/*.sql"]` に変更する
  （036〜039 が登録漏れしていた。glob 化で採番順に全 seed が適用され、追加時の更新漏れを防ぐ）

### 5. スコープは oshikatsu-web に限る

- household-web はローカル環境（config.toml）を整備しない。将来必要になれば同じ仕組みを
  `apps/household-web/supabase/` に用意する

## Consequences（結果・影響）

### 良い点

- 本番 DB 直あてのリスクが解消され、migration をローカル + CI で検証してから本番反映できる
- AI が RLS ポリシーを含む DB 変更を実際に実行して検証できるようになり、開発の安全性が上がる
- seed 登録漏れが構造的に起きなくなる

### 悪い点

- 開発環境に Docker + Supabase CLI が必須になる（`docs/ai/PROJECT.md` §3 の前提を追加）
- `supabase start` は複数コンテナ起動で CI 時間・ローカルリソースを消費する
  （重ければ起動サービスの絞り込みを検討する）
- 本番とローカルの migration 履歴を初回に突き合わせる作業が発生する

## Notes

- 発端 Issue: #322（Options / Trade-offs の詳細はそちら）
- 関連: `docs/orbit-roadmap.md` Phase 4 P1-2、`docs/ops/local-supabase.md`、
  `docs/ai/PROJECT.md` §9（「Docker 導入」の非目標転換）
- CI / バックアップの Supabase CLI バージョンは `2.109.1` に固定（`db-verify.yml` / `backup-db.yml`）
