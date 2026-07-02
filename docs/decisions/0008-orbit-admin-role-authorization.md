# ADR 0008: Orbit 認可レイヤーのオーナー限定化（app_metadata.role）

## Status

Accepted

## Context（背景）

Orbit の Supabase RLS は当初 `auth.role() = 'authenticated'`（migration 002）で統一されており、
ログイン済みユーザーであれば全操作が可能だった。
migration 008 では Supabase Performance Advisor の指摘を受け `(select auth.role()) = 'authenticated'`
への書き換えのみを実施し、認可ロジック自体は変更していなかった。

`docs/advisor/006-oshikatsu-web-current-state-audit.md` での全体監査と Issue #213 の検討において、
以下の観点から認可強化が必要と判断した。

- Supabase Auth の新規サインアップは OFF に設定済みであり、既存ユーザー = オーナーのみという前提は確認済み
- しかし「サインアップ OFF」は運用設定であって DB 制約ではない。誤って解除された場合や、
  将来の閲覧専用アカウント追加を想定すると、RLS レイヤーでも制限を設けるべき
- 多層防御（Defense in Depth）として、認証（サインアップ OFF）とは独立した認可レイヤーが必要

## Decision（決定）

### 1. ロール判定関数の集約

`app_metadata.role = 'admin'` という判定を `public.is_orbit_admin()` 関数に集約する。
ロール名のハードコードを各ポリシーに分散させず、関数1か所に閉じ込めることで
将来のロール名変更コストを最小化する。

関数仕様:
- `LANGUAGE sql STABLE SET search_path = ''` — search_path 固定は規約（migration 005 参照）
- `COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'` — jwt() が NULL の場合も安全に false を返す

### 2. ポリシーの形式

`(select public.is_orbit_admin())` という subselect 形式を採用する。
これは migration 008 で導入した initplan 最適化（Supabase Performance Advisor 対応）と整合するためで、
同じクエリ内での関数呼び出しを1回に抑える。

### 3. 既存ユーザーへの backfill

サインアップ OFF・単一ユーザー運用が確認済みのため、全既存ユーザーに admin ロールを付与する。

```sql
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb;
```

### 4. orbit_* テーブルの動的一括置き換え

migration 履歴から静的にポリシー一覧を導出するとドリフト（テーブル追加漏れ）が起きるため、
DO ブロックで `pg_tables` / `pg_policies` から動的に処理する方式を採用する。

### 5. storage.objects ポリシーの明示的な書き直し

bucket_id / name prefix という固有条件があり、動的置換が適さないため
`DROP POLICY IF EXISTS` + `CREATE POLICY` の組み合わせで明示的に書き直す。
既存の bucket_id・name prefix 条件は維持し、`(select public.is_orbit_admin())` を AND で追加する。

### 6. アプリ境界（proxy）のロールガード

閲覧系の read path は service role client（ADR 0006）を使うため RLS を通らず、
RLS 変更だけでは「認証済みだが admin でないユーザー」のアプリ経由の読み取りを拒否できない。
このため `@personal-hub/supabase` の auth middleware に `requiredRole` 設定を追加し、
oshikatsu-web の `proxy.ts` で `requiredRole: "admin"` を指定して非 admin を
`login?error=forbidden` へ遮断する（PR #227 レビュー指摘への対応）。

- ロール判定は JWT の `app_metadata` から行い、追加の DB アクセスは発生しない
- `requiredRole` は opt-in（default: null）のため、household-web は従来どおりログイン有無のみで動作する
- これにより読み取りは「アプリ境界ガード」、書き込みは「アプリ境界ガード + RLS」の多層になる

## Consequences（結果・影響）

### 良い点

- RLS レイヤーで認可を二重化し、サインアップ OFF 設定に依存しない多層防御が実現する
- `is_orbit_admin()` 関数への集約により、ロール名変更時の対応箇所が1か所になる
- 動的 DO ブロックにより、将来の orbit_* テーブル追加時に自動的にポリシーが適用される
- `(select ...)` subselect 形式により、initplan 最適化が維持される

### 悪い点

- **JWT 再発行（再ログイン）まで反映されない**: backfill 実行後、既存セッションの JWT には
  まだ `app_metadata.role = 'admin'` が含まれていない。ユーザーは一度ログアウト→再ログインが必要
- **ロール付与の運用が必要**: 将来 admin ユーザーを追加する場合は `raw_app_meta_data` の手動更新が必要
- **service role read path は RLS の影響を受けない**: ADR 0006 で導入した
  `SUPABASE_SERVICE_ROLE_KEY` を使う read-only client は RLS をバイパスするため、
  閲覧系 shared cache の動作は変わらない。閲覧の認可は Decision 6 の proxy ロールガードが担い、
  書き込み系 Server Action は auth client を使うため RLS でも拒否される
- **proxy ガード・RLS とも JWT の claim を信頼する**: RLS も `auth.jwt()` の
  `app_metadata.role` を参照するため、ロール剥奪は閲覧・書き込みとも JWT 再発行/失効
  （access token の有効期限、既定1時間）まで反映にラグがある。
  即時遮断が必要な場合は、対象ユーザーのセッション失効（refresh token 無効化）や
  ユーザー削除などの追加の運用手順が必要

## Notes

- 実装: migration 045、Issue #213
- 将来の admin/viewer ロール体系（閲覧のみ共有）の拡張は Issue #221 で検討
  （SELECT ポリシーのみを admin OR viewer に拡張する中規模変更で対応可能）

## 追記（2026-07-02, #221）

### viewer ロールの導入

`app_metadata.role` に `viewer` を追加し、admin/viewer の2ロール体系にする。

- **viewer**: 閲覧（SELECT）のみ許可。書き込み（INSERT/UPDATE/DELETE）は不可
- **admin**: 従来通り閲覧・書き込みともに許可
- 上記以外（未設定・不正な値）は引き続きアクセス不可

### `has_orbit_read_role()` の追加と使い分け

`is_orbit_admin()` とは別に `public.has_orbit_read_role()` を新設し、
`COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'viewer')` で判定する。
形式（`LANGUAGE sql STABLE SET search_path = ''`、`(select ...)` subselect）は
`is_orbit_admin()` と揃えている。

役割分担:
- `has_orbit_read_role()`: orbit_* テーブルの SELECT ポリシーでのみ使用
- `is_orbit_admin()`: orbit_* テーブルの INSERT/UPDATE/DELETE ポリシー、および
  proxy の `requiredRole` ガード（書き込み・管理操作の入口）で使用

migration 046 では、045 で作成した `<table>_select` ポリシーのみを
`has_orbit_read_role()` で DROP → CREATE し直し、`<table>_insert` /
`<table>_update` / `<table>_delete` ポリシーには一切手を加えていない
（`is_orbit_admin()` のまま据え置き）。

storage.objects については、member-images / release-images /
track-costume-images の3バケットがいずれも `public = true` で作成されており、
045 の時点から SELECT ポリシー自体が存在しない（public バケットの読み取りは
Storage の公開エンドポイント経由で RLS を通らないため）。
そのため viewer 導入でも storage.objects への変更は発生しない。
書き込み系ポリシーは 045 のまま `is_orbit_admin()` 限定を維持する。

### ロール剥奪の反映ラグは viewer にも同様に適用される

migration 045 の Consequences で述べた「ロール剥奪は JWT 再発行/失効まで
反映にラグがある」という制約は、viewer ロールの剥奪（viewer → 無ロール、
または viewer → admin への変更）にも同様に適用される。
RLS・proxy ガードともに `auth.jwt()` の `app_metadata.role` を参照するため、
即時遮断が必要な場合はセッション失効やユーザー削除などの追加運用が必要な点も変わらない。

### ロール付与手順

新規に viewer（または admin）ユーザーを追加する場合、以下のいずれかの方法で
`app_metadata.role` を設定する。

**方法1: Supabase ダッシュボード**

1. Supabase ダッシュボードで対象プロジェクトを開く
2. `Authentication` → `Users` → 対象ユーザーを選択
3. `User Metadata` ではなく **`App Metadata`** を編集する
   （User Metadata はユーザー自身が変更可能なため認可判定に使ってはならない）
4. 以下を設定する

   ```json
   { "role": "viewer" }
   ```

   admin にする場合は `"role": "admin"` とする。

**方法2: SQL（Supabase SQL Editor 等）**

```sql
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "viewer"}'::jsonb
WHERE email = 'target-user@example.com';
```

いずれの方法でも、**設定後は対象ユーザーの再ログインが必要**
（JWT の `app_metadata` はログイン時に発行されるため、既存セッションには反映されない）。

### Notes 更新

- 実装: migration 046、Issue #221
