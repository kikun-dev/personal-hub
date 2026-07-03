# ADR 0009: Orbit ユーザー別データ（参加記録）の導入方針

## Status

Accepted

## Context（背景）

Orbit のデータはこれまで全てグローバル（全ユーザー共通・書き込みは admin のみ、ADR 0008）であり、
閲覧はユーザー横断で共有できる前提で service role + `unstable_cache` の
shared read cache（ADR 0006）を採用してきた。

Issue #103 / #246 のライブ参加記録は、この前提から外れる **Orbit 初のユーザー別データ**である。

- 参加記録は本人の行動記録であり、ユーザーごとに内容が異なる
- viewer ロール（ADR 0008 追記、閲覧のみ）にも参加記録の書き込みだけは許可したい
- ユーザー別データを shared cache に載せると、他ユーザーへの漏えいや誤表示に直結する

## Decision（決定）

### 1. RLS: 本人限定 + ロール判定の組み合わせ

ユーザー別テーブル（`orbit_live_attendances`）の RLS は 4 操作すべて

```sql
(select public.has_orbit_read_role()) AND user_id = (select auth.uid())
```

とする（migration 047）。

- `has_orbit_read_role()`（admin / viewer、migration 046）で「Orbit の利用権限があるユーザー」に限定し、
  `auth.uid()` で本人の行にのみ絞る
- グローバルテーブルの標準パターン（SELECT: has_orbit_read_role / 書き込み: is_orbit_admin）の
  **例外**であることを migration コメントに明記する。045 のような動的ポリシー一括置換を
  将来行う場合は、ユーザー別テーブルを対象から除外する

### 2. キャッシュ: shared read cache に載せない

ユーザー別データは service role + `unstable_cache` の共有キャッシュ（ADR 0006）の対象外とする。

- 読み取りは認証付き server client（RLS 適用）で都度取得する
- グローバルデータと同居する画面（例: ライブ詳細 = 公演・セトリ + 自分の参加記録）は、
  グローバル部分を従来の shared cache のまま維持し、ユーザー別部分だけを
  ページ側で別途取得して合成する（キャッシュキーにユーザーを混ぜない）

### 3. Server Actions のガード: requireOrbitUser()

viewer も書き込めるため `requireAdmin()`（ADR 0008 追記）は使えない。
`lib/requireOrbitUser.ts` を新設し、admin / viewer のいずれかであることを確認して
認証済みクライアントと user を返す。

- `user_id` は必ずサーバー側で `auth.uid()`（getUser の結果）由来を使い、
  クライアントからの入力を信用しない
- 漏れても RLS が本人以外の行を拒否する（多層防御、ADR 0008 と同じ構図）

## Consequences（結果・影響）

### 良い点

- ユーザー別データの読み書きが RLS レベルで本人に限定され、アプリ側のバグが漏えいに直結しない
- shared cache の設計（ADR 0006）を変更せずに、ユーザー別データを追加できる
- viewer への書き込み許可を「ユーザー別テーブルのみ」に閉じ込められる（グローバルデータは admin のみのまま）

### 悪い点

- ユーザー別データを含むページは、その部分だけキャッシュが効かず毎リクエスト DB を読む
  （参加記録は本人の小規模データのため許容。問題になれば per-user のキャッシュ戦略を別途検討）
- グローバル/ユーザー別でポリシーパターンが2系統になり、migration 時の注意点が増える
  （`/migration` スキルのチェックリストで担保）

## Notes

- 実装: migration 047、Issue #246（アンブレラ #103）
- 後続: マイページ #247 / ビジュアライズ #248 / セトリカウント #249 / 会場集計 #250 も本方針に従う

## 追記（2026-07-03, #253）

公演削除時のユーザー別データ（参加記録）の扱いを、047 で採用した
**ON DELETE RESTRICT** から、**アプリ側の明示確認 + ON DELETE CASCADE**
（migration 049）に変更した。

### 理由

- RLS は本人の行にのみアクセスを許可するため、admin であっても
  自分以外（viewer 等）の参加記録は見えず、解除もできない。
- そのため「viewer の参加記録が付いた公演」は、admin が編集・削除
  しようとしても RESTRICT 違反で手詰まりになっていた
  （PR #253 レビュー議論）。
- 公演・ライブの削除は admin 限定の操作であり、アプリ側（LiveForm /
  ライブ削除の確認ダイアログ）で「参加記録も一緒に削除される」旨を
  明示確認できる。DB レベルで一律拒否するより、確認を挟んだ上で
  CASCADE 削除する方が運用上妥当と判断した。

### 048 との関係

048 で導入した「`upsert_orbit_live` が payload に id がある公演は
UPDATE 扱いにして公演IDを維持する」方式は、この変更後も
**サイレント消失を防ぐ前提として引き続き必須**である。この方式が
無ければ、通常のライブ編集のたびに全公演が DELETE→再INSERTされ、
CASCADE によって参加記録が編集の都度気づかれずに全消失してしまう。
048 により、公演自体を削除しない通常編集では CASCADE は発火しない。

### 影響

- `orbit_live_attendances.performance_id` の FK: RESTRICT → CASCADE
  （migration 049）
- `LiveForm`: 編集モードで既存公演（id あり）が state から削除されている
  場合のみ、送信前に `window.confirm` で確認する
- ライブ本体の削除（`DeleteButton`）: 確認文言に「参加記録も削除されます」
  を追記
- repository / server action 側の 23503（旧 RESTRICT 違反）向けの
  専用エラーハンドリングは撤去した（CASCADE では発生しなくなったため）
