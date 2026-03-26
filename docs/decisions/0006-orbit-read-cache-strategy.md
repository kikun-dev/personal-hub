# ADR 0006: Orbit 閲覧導線の read cache 戦略

## Status
Accepted

## Context（背景）

Orbit はグローバルデータを扱うため、閲覧ページでも毎回 Supabase セッション付き server client を生成しやすい。
この構成では `cookies()` 依存が各ページに伝播し、共有キャッシュを使いにくい。

さらに `apps/oshikatsu-web/app/(authenticated)/layout.tsx` では middleware に加えて
`supabase.auth.getUser()` を実行しており、画面遷移ごとの固定コストになっていた。

一方で Orbit の RLS は `auth.role() = 'authenticated'` を前提にしており、
匿名クライアントだけでは共有キャッシュ可能な read path を構成できない。

## Decision（決定）

### 1. 認証ガード

閲覧ページの認証ガードは `proxy.ts` に集約する。
`(authenticated)` layout では `supabase.auth.getUser()` を行わない。

### 2. 閲覧系クライアント

閲覧系は `SUPABASE_SERVICE_ROLE_KEY` がある環境では
read-only 用 server client を使って共有キャッシュを有効にする。

キーがない環境では従来のセッション付き server client にフォールバックし、
機能を維持したまま shared cache だけ無効化する。

### 3. キャッシュ単位

閲覧系の read model は `unstable_cache` とドメイン単位の cache tag を使う。

- `orbit:top`
- `orbit:members`
- `orbit:songs`
- `orbit:releases`
- `orbit:groups`
- `orbit:event-types`
- `orbit:people`
- `orbit:song-options`

### 4. 更新後の再検証

Server Action 成功時は `updateTag` を使い、影響するドメインだけを即時失効させる。
初期段階では ID 単位ではなくドメイン単位の invalidation を採用する。

## Consequences（結果・影響）

### 良い点

- 閲覧導線から layout レベルの重複認証がなくなる
- `SUPABASE_SERVICE_ROLE_KEY` を設定した環境では共有キャッシュを有効化できる
- 更新時の再検証範囲が `revalidatePath` より明示的になる

### 悪い点

- 本番で最大効果を出すには `SUPABASE_SERVICE_ROLE_KEY` の設定が必要
- service role を使う read path は server-only の利用前提で運用する必要がある
- invalidation は当面ドメイン単位のため、将来的に粒度改善の余地がある

## Notes

- 実装は Issue #66 で導入
- 一覧クエリの軽量化や top 集約クエリの最適化は Issue #68 で継続対応する
