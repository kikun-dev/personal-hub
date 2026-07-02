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
- **service role read path は本変更の影響を受けない**: ADR 0006 で導入した
  `SUPABASE_SERVICE_ROLE_KEY` を使う read-only client は RLS をバイパスするため、
  閲覧系 shared cache の動作は変わらない。ただし書き込み系 Server Action は auth client を使うため
  本変更の影響を受ける（= admin ロールが必要）

## Notes

- 実装: migration 045、Issue #213
- 将来の admin/viewer ロール体系（閲覧のみ共有）の拡張は Issue #221 で検討
  （SELECT ポリシーのみを admin OR viewer に拡張する中規模変更で対応可能）
