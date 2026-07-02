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

閲覧系の read model は `unstable_cache` と cache tag を使う。
Issue #66 時点ではドメイン単位を基本とし、Issue #68 で公開導線の list/detail を分離した。
Issue #67 では管理導線も同じ shared read client を使うが、対象本体は no-store 相当のページ fetch に残し、
共有可能な候補マスタだけを別 read model として切り出す。

- `orbit:top`
- `orbit:members`
- `orbit:members:list`
- `orbit:members:detail`
- `orbit:songs`
- `orbit:songs:list`
- `orbit:songs:detail`
- `orbit:releases`
- `orbit:releases:list`
- `orbit:releases:detail`
- `orbit:groups`
- `orbit:event-types`
- `orbit:people`
- `orbit:song-options`
- `orbit:lives`
- `orbit:lives:detail`
- `orbit:venues`

Top ページは通常イベント/誕生日に加えて、ライブ公演日、リリース日、MV/関連動画の配信日を合成表示するため、
`orbit:top` / `orbit:lives` / `orbit:releases` / `orbit:songs` の tag に連動させる。

### 4. 更新後の再検証

Server Action 成功時は `updateTag` を使い、影響するドメインだけを即時失効させる。
初期段階では ID 単位ではなくドメイン単位の invalidation を採用する。
管理導線では、制作陣更新時に `orbit:people` に加えて関連する楽曲・リリース詳細も失効対象に含める。

## Consequences（結果・影響）

### 良い点

- 閲覧導線から layout レベルの重複認証がなくなる
- `SUPABASE_SERVICE_ROLE_KEY` を設定した環境では共有キャッシュを有効化できる
- 更新時の再検証範囲が `revalidatePath` より明示的になる
- 公開一覧は詳細ページ向け payload を引かずに済むため、一覧遷移の固定コストを下げやすい

### 悪い点

- 本番で最大効果を出すには `SUPABASE_SERVICE_ROLE_KEY` の設定が必要
- service role を使う read path は server-only の利用前提で運用する必要がある
- invalidation は当面ドメイン単位のため、将来的に粒度改善の余地がある

## Notes

- 実装は Issue #66 で導入
- Top 集約クエリと public list DTO は Issue #68 で追加した
- 管理フォーム向けの master cache と option DTO は Issue #67 で追加した
- ライブ公演日/リリース日/動画配信日の Top 集約表示は Issue #125 / #207 で追加した
- `createReadOnlyClient` の型レベル read-only 化は Issue #215 で検討する

## 追記（2026-07-02, #215）

`createReadOnlyClient` が返す型を、書き込みメソッドを呼ぶとコンパイルエラーになる
`ReadOnlySupabaseClient`（`packages/supabase`）に変更した。
さらに oshikatsu-web 側では、read path で使う read/write rpc を判別できるよう
`OrbitReadClient`（`apps/oshikatsu-web/types/orbitReadClient.ts`）を定義し、
`rpc` を許可した読み取り専用 RPC 関数名のユニオン（`OrbitReadRpcFunction`）に絞った。
`readOrbitData.ts` / `readOrbitAdminData.ts` の `withOrbitReadClient` と、read path で使う
9 リポジトリ（event/eventType/group/live/member/person/release/song/venue）の引数型を
`OrbitReadClient` に変更している。

rpc は Database の生成型が無い現状では引数・返り値から読み書きを型で判別できないため、
関数名ユニオンで代替する運用とした。生成型を導入する Issue #216 で、より厳密な判別に置き換える。

各リポジトリの書き込みメソッド（insert/update/delete/upsert、更新系 rpc）は、
メソッド冒頭で `asWritableClient`（`apps/oshikatsu-web/lib/asWritableClient.ts`）を通して
フル権限の `SupabaseClient` に変換してから呼び出す。read-only client を write path に
渡さない規律をこのヘルパーに集約する狙いだが、read/write の呼び出しが同じリポジトリ内に
同居する構造自体は変えていない。リポジトリの read/write 分割は Issue #217 で対応する。
