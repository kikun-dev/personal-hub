# Orbit ロードマップ

## Phase 1: メンバー管理 + トップページ（PR #29）

### 完了済み

- [x] DB スキーマ（7テーブル + RLS + Seed）
- [x] プロジェクトスキャフォールド（`oshikatu-web` → `oshikatsu-web` リネーム含む）
- [x] 認証（`@personal-hub/supabase` 共有パッケージ使用）
- [x] 型定義（group, member, event, eventType, repositories, errors, result）
- [x] Repository 層（group, member, event, eventType）
- [x] UseCase 層（CRUD + validation + カレンダー系）
- [x] UI コンポーネント（Button, Input, Select, Textarea, Badge, Card, GroupBadge）
- [x] メンバー一覧・詳細ページ
- [x] メンバー管理画面（CRUD）
- [x] トップページ（カレンダー + 今日のイベント + 今日はなんの日）
- [x] イベント管理画面（CRUD）
- [x] CI ワークフロー（`ci-oshikatsu-web.yml`）
- [x] ローカル動作確認

### 未完了（マージ前後の対応）

- [x] Supabase で SQL マイグレーション実行（001〜003）
- [x] PR #29 レビュー・マージ
- [x] Vercel デプロイ設定（oshikatsu-web）
- [x] Supabase Dashboard で本番 Redirect URL 追加
- [ ] メンバーデータの初期投入

---

## Phase 1.5: 改善・安定化（Issue #30）

### 完了済み

- [x] カレンダー月切り替え時のサーバーデータ再取得（URL search params + MonthSelector）
- [x] 誕生日/OnThisDay クエリの RPC 関数化（Postgres 関数 3 つ作成）
- [x] `next/image` への移行（Supabase Storage `remotePatterns` 設定）
- [x] メンバー一覧のソート強化（現役→OG 順）
- [x] Header のモバイル対応（ハンバーガーメニュー）
- [x] Admin events ページに月ナビゲーション追加
- [x] MemberForm のグループ子フォームに安定した React key を使用
- [x] `MemberFilters` / MonthSelector の `Suspense` に fallback 追加

### 未完了（マージ前後の対応）

- [x] Supabase で SQL マイグレーション実行（004）

### 残タスク（バリデーション強化）— Issue #32 → PR #35 で対応済み

- [x] テキストフィールドの最大長チェック追加（P1: DB 側も TEXT 制約なし）
- [x] `validateEvent` で `endDate >= date` チェック追加（P1）
- [x] `heightCm` の範囲チェック追加（P1: 0 < x < 300）
- [x] `bloodType` のサーバーサイドバリデーション追加（P2）
- [x] `dateOfBirth` のフォーマットバリデーション追加（P2）

### 残タスク（コード品質）— Issue #32 → PR #35 で一部対応済み

- [x] `GROUP_COLORS` 定数の使用状況確認・整理（P2: 未使用のため削除）
- [x] `groupRepository`, `eventTypeRepository` の `select("*")` を明示的カラム指定に変更（P2）
- [x] Repository update の非アトミック操作を RPC 関数でトランザクション化（Issue #33）
- [x] Issue #27 の改善項目（Supabase 共有パッケージ）

### 残タスク（UI/設定）— Issue #32 → PR #35 / Issue #33

- [x] トップ画面: 日付選択連動（選択日のイベント/なんの日更新 + Today ボタン）— Issue #40 → PR #41
- [x] `next.config.ts` の `remotePatterns` を自プロジェクトの hostname に限定（Issue #46）
- [x] メンバー画像バリデーションを Storage object path + 旧Supabase公開URL互換へ更新（Issue #46）
- [x] EventCalendar の月ラベルと MonthSelector の重複表示を解消（Issue #33）
- [x] 誕生日ドットの色 `#D946EF` を定数に抽出（P2）
- [x] Header ナビに「管理」→ `/admin` ハブに変更、「楽曲」リンク追加（Phase 2 で対応）
- [x] household-web の MonthSelector に `basePath` prop をバックポート（Issue #33）
- [x] household-web の MonthSelector Suspense に fallback 追加（Issue #33）

---

## Phase 2: コンテンツ拡充

### メンバー情報拡張 — Issue #44（完了） / #54（PR #55） / #56（PR #57）

#### 完了済み（Issue #44）

- [x] 星座の保存・表示追加（生年月日から計算）
- [x] 期生入力を数値選択化（グループごとの上限参照）
- [x] コール名の追加
- [x] サイリウムカラー2色の追加（同色可）
- [x] SNS（種別/表示名/URL）の複数登録対応

#### 実装済み（Issue #54 / PR #55 で対応）

- [x] メンバー一覧の初期表示を現役に変更
- [x] グループ履歴に在籍日数を表示（現役は加入日〜当日）
- [x] レギュラー仕事を廃止し、来歴（日時/出来事/備考）セクションを追加
- [x] 来歴の備考中の http(s) URL を自動リンク化
- [x] プロフィールにメモ欄を追加（自由入力）
- [x] メンバー登録/編集フォームへの反映
- [x] メンバー詳細表示への反映
- [x] DB マイグレーション + 型/Repository/UseCase/バリデーション対応

#### 実装済み（Issue #56 / PR #57 で対応）

- [x] メンバー来歴の管理元を `orbit_events` に統合（単一ソース化）
- [x] `orbit_events.is_member_history` を追加し、来歴イベントを識別
- [x] 既存 `orbit_member_histories` データを `orbit_events` + `orbit_event_members` へ移行（重複統合）
- [x] `orbit_member_histories` テーブルを廃止
- [x] イベント作成/編集に「メンバー来歴に表示する」フラグを追加
- [x] 来歴イベント時の関連メンバー必須バリデーションを追加
- [x] メンバー作成/編集フォームから来歴入力欄を削除
- [x] メンバー詳細の来歴表示をイベント由来に切り替え（古い日付順）
- [x] 来歴備考のURL重複表示を回避（説明文内に同一URLがある場合は追記しない）
- [x] 来歴備考のリンク表示を拡張（生URL + Markdownリンク記法 `[text](https://...)`）

### メンバー画像アップロード移行 — Issue #46

#### 完了済み

- [x] Supabase Storage バケット/ポリシー追加（public + authenticated upload）
- [x] メンバー登録/編集フォームをURL入力からファイルアップロードUIへ変更
- [x] `orbit_members.image_url` にStorage object pathを保存
- [x] 画像表示時に object path を public URL へ変換（旧Supabase公開URLのみ後方互換）
- [x] 画像再アップロード時に旧オブジェクトを削除して置換
- [x] 画像バリデーションをStorage path前提へ更新

### 楽曲DB再設計（リリース中心）— Issue #58

要件確定ドキュメント: `docs/ai/orbit-phase2-release-song-requirements.md`

#### 完了済み

- [x] 既存 `orbit_songs` 系テーブルを置換し、リリース中心モデルへ再設計する
- [x] リリースタイプ `single/album/digital_single/other` とタイプ別ナンバリング制約を実装する
- [x] 楽曲とリリースを M:N で管理し、リリースごとの曲順を保持する
- [x] 人物マスタ新設 + クレジット（作詞/作曲/編曲/振付）複数人対応を実装する
- [x] フォーメーション（列数・列ごとの人数・参加メンバー）と整合バリデーションを実装する
- [x] MV（リンク必須条件付き）と衣装（複数 + 画像 + 担当）を実装する
- [x] Admin CRUD と公開一覧/詳細を新モデルへ置換する
- [x] メンバー詳細ページに参加楽曲セクションを追加する
- [x] 公開側リリース一覧/詳細ページを追加する（`/releases`, `/releases/[id]`）

#### 参考（旧実装の履歴）

- [x] 旧楽曲DB実装（Issue #36 / PR #37）
- [x] `orbit_songs`, `orbit_song_groups`, `orbit_song_members` 導入
- [x] 旧フォーメーション表示（フロント/2列目/3列目/アンダー）
- [x] 楽曲管理画面と公開画面（旧モデル）実装

### UI/運用改善（第2弾）

- [x] Top画面2カラム化と右ナビ導入（Issue #60）
  - [x] 左2/3にカレンダー/イベント、右1/3に完全版ナビを配置
  - [x] スマホでは右ナビを非表示（ハンバーガー導線へ一任）
  - [x] Top本文側の `Orbit` 見出しを削除（ヘッダーロゴ導線へ統一）
  - [x] Topの月操作は `Today` 左寄せ、`前月/翌月` 右寄せに調整
  - [x] 上部ナビ/右ナビから `トップ` 項目を除外（`Orbit` ロゴで遷移）
- [ ] リリース/楽曲管理UX改善（Issue #61）
  - [ ] 双方向紐づけ編集 + タイトル/人物検索導線の追加
  - [ ] リリースのアートワークを「担当者 + 画像アップロード」へ移行
- [ ] 制作陣マスタ管理画面の新規追加（Issue #62）
  - [ ] 一覧/詳細/CRUD と担当（複数）管理を実装
  - [ ] 導線はトップ右ナビからのみ提供（上部ヘッダー非表示）
  - [ ] Header用ナビ（簡易）とTop右ナビ（完全版）の定義を分離する

### ライブ情報 + セットリスト

| テーブル（想定） | 説明 |
|---|---|
| `orbit_lives` | ライブ公演 |
| `orbit_setlist_items` | セットリスト（曲順付き） |

- ライブ一覧・詳細ページ
- セットリスト管理

---

## Phase 3: 発展機能

- メディア出演管理（`orbit_media`）
- 公開アクセス対応（RLS の SELECT ポリシーを `true` に変更）
- 遠征持ち物リスト
- スケジュール分析（イベントデータからの集計・可視化）
- 外部サイトリンク集

---

## 技術的負債・既知の制限

| 項目 | 詳細 | 対応方針 |
|---|---|---|
| ~~`<img>` 使用~~ | ~~lint warning あり~~ | ✅ Phase 1.5 で `next/image` に移行済み |
| ~~全件取得フィルタ~~ | ~~誕生日/OnThisDay で全件取得~~ | ✅ Phase 1.5 で RPC 関数化済み |
| ~~カレンダー月切り替え~~ | ~~データは初期ロード時の月のみ~~ | ✅ Phase 1.5 で URL search params 対応済み |
| ~~middleware 非推奨警告~~ | ~~Next.js 16 で `middleware.ts` が deprecated~~ | ✅ Issue #27 対応で `proxy.ts` へ移行済み |
| Repository update 非アトミック | update の全削除→再挿入がトランザクションなし | RPC 関数でトランザクション化 |
| `UpdateXxxInput = CreateXxxInput` | 部分更新不可（全フィールド送信が必要） | フォームは常に全フィールド送信するため当面問題なし |
| Top右ナビとHeaderの項目定義が共有 | #60時点では `APP_NAV_ITEMS` を共通利用しており、簡易/完全版の役割分離が未完了 | Issue #62 で `HEADER_NAV_ITEMS` / `TOP_NAV_ITEMS` に分離予定 |
