# ADR 0005: Orbit (oshikatsu-web) Phase 1 設計

## Status
Accepted

## Context（背景）

推し活データベースサイト Orbit を `apps/oshikatsu-web` として構築する。
対象は乃木坂46/櫻坂46/日向坂46/(欅坂46/けやき坂46)。
個人利用（認証必須）だが、将来的に閲覧専用の公開も視野に入れる。

Phase 1 のスコープ:
- メンバー管理（一覧・詳細・管理画面 CRUD）
- トップページ（月間カレンダー・今日のイベント・今日はなんの日）
- イベント管理（管理画面 CRUD）

主な設計課題:
- household-web と同一 Supabase プロジェクトでのテーブル名前空間分離
- per-user ではないグローバルデータの RLS 設計
- 誕生日とイベントの統合表示

---

## Decision（決定）

### 1. DB 名前空間

全テーブルに `orbit_` プレフィクスを付与し、household-web のテーブルと分離する。

### 2. RLS 方針

グローバルデータ（per-user ではない）のため、全操作を `auth.role() = 'authenticated'` で統一する。
将来の公開時は SELECT ポリシーを `true` に変更するだけで対応可能。

### 3. 誕生日の扱い

イベントテーブルには保存しない。メンバーの `date_of_birth` から UseCase 層で動的に生成し、
`CalendarEvent` union 型（`Event | BirthdayEvent`）でイベントとマージする。

### 4. 誕生日/OnThisDay クエリ

PostgREST の `date` 型に `like` が使えないため、全件取得後にアプリ側でフィルタする。
メンバー数は数百人規模のためパフォーマンス上問題なし。
データ量が増加した場合は RPC 関数に移行する。

### 5. 中間テーブルの更新戦略

`orbit_member_groups`, `orbit_event_groups`, `orbit_event_members` の更新時は
全削除→再挿入（全置換）方式を採用する。シンプルさを優先。

### 6. アーキテクチャ

household-web と同パターン（Types → Repository → UseCase → Server Action）。
Repository に `userId` パラメータなし（グローバルデータのため）。

### 7. グループ改名関係

`orbit_groups.successor_id` で「欅坂46 → 櫻坂46」「けやき坂46 → 日向坂46」の
改名関係を表現する。

---

## Alternatives Considered（検討した代替案）

### 誕生日をイベントテーブルに保存する
- メンバー追加時に自動挿入が必要
- メンバー削除時の連動削除が複雑
- 毎年のイベント生成が必要
- → UseCase 層での動的生成の方がシンプル

### per-user RLS（household-web と同方式）
- グローバルデータなので `user_id` カラムが不要
- 複数ユーザーが同じデータを編集する前提
- → `auth.role() = 'authenticated'` で統一

### 誕生日クエリに DB 側 RPC 関数を使う
- `EXTRACT(MONTH FROM date_of_birth)` で正確にフィルタ可能
- 現時点ではデータ量が少なくオーバースペック
- → データ量増加時に移行予定

---

## Consequences（結果・影響）

### 良い点
- household-web と同アーキテクチャで学習コストゼロ
- `orbit_` プレフィクスで安全な名前空間分離
- 公開対応が RLS ポリシー変更のみで可能
- 誕生日の動的生成で DB 整合性の心配がない

### 悪い点
- 全件取得→フィルタはデータ量増加で非効率になる可能性
- 中間テーブル全置換はトランザクション不整合のリスク（低確率）

---

## Review Trigger（見直し条件）

以下が発生した場合、この ADR を見直す:

- メンバー数が 1,000 人を超え、全件取得フィルタがボトルネックになった場合
- 複数ユーザーが同時編集する運用が発生した場合
- Phase 2 の楽曲/ライブ機能で中間テーブル更新の整合性が問題になった場合

---

## Notes

Phase 1 の実装は PR #29 で完了。Issue #28 で管理。
Phase 2 以降の機能候補は `docs/orbit-roadmap.md` を参照。
