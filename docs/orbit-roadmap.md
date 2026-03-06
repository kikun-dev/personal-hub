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
- [ ] Repository update の非アトミック操作を RPC 関数でトランザクション化（P1: create は補償処理済み）
- [ ] Issue #27 の改善項目（Supabase 共有パッケージ）

### 残タスク（UI/設定）— Issue #32 → PR #35 / Issue #33

- [x] トップ画面: 日付選択連動（選択日のイベント/なんの日更新 + Today ボタン）— Issue #40 → PR #41
- [x] `next.config.ts` の `remotePatterns` を自プロジェクトの hostname に限定（Issue #46）
- [x] メンバー画像バリデーションを Storage object path + 既存 https 互換へ更新（Issue #46）
- [ ] EventCalendar の月ラベルと MonthSelector の重複表示を解消（P2）
- [x] 誕生日ドットの色 `#D946EF` を定数に抽出（P2）
- [x] Header ナビに「管理」→ `/admin` ハブに変更、「楽曲」リンク追加（Phase 2 で対応）
- [ ] household-web の MonthSelector に `basePath` prop をバックポート（P2: cross-app 改善）
- [ ] household-web の MonthSelector Suspense に fallback 追加（P2: cross-app 改善）

---

## Phase 2: コンテンツ拡充

### メンバー情報拡張 — Issue #44

#### 対応予定

- [ ] 星座の保存・表示追加（生年月日から計算）
- [ ] 期生入力を数値選択化（グループごとの上限参照）
- [ ] コール名の追加
- [ ] サイリウムカラー2色の追加（同色可）
- [ ] SNS（種別/表示名/URL）の複数登録対応
- [ ] レギュラー仕事（種別/名前/開始日/終了日）の複数登録対応
- [ ] メンバー登録/編集フォームへの反映
- [ ] メンバー詳細表示への反映
- [ ] DB マイグレーション + 型/Repository/UseCase/バリデーション対応

### メンバー画像アップロード移行 — Issue #46

#### 完了済み

- [x] Supabase Storage バケット/ポリシー追加（public + authenticated upload）
- [x] メンバー登録/編集フォームをURL入力からファイルアップロードUIへ変更
- [x] `orbit_members.image_url` にStorage object pathを保存
- [x] 画像表示時に object path を public URL へ変換（旧Supabase公開URLのみ後方互換）
- [x] 画像再アップロード時に旧オブジェクトを削除して置換
- [x] 画像バリデーションをStorage path前提へ更新

### 楽曲データベース — PR #37 で対応済み（Issue #36）

#### 完了済み

- [x] DB マイグレーション（`orbit_songs`, `orbit_song_groups`, `orbit_song_members`）
- [x] 楽曲は複数グループに所属可能（M:N）
- [x] フォーメーション表示（ポジション: フロント/2列目/3列目/アンダー + センター★マーク）
- [x] 型定義 + 定数（`Song`, `SongMember`, `SONG_POSITIONS`）
- [x] Repository 層（CRUD + `findByMemberId`）
- [x] UseCase 層（validate / create / update / delete / list / get）
- [x] Admin ハブページ（`/admin` — メンバー/イベント/楽曲管理への入口）
- [x] 楽曲管理画面（一覧 / 作成 / 編集 / 削除）
- [x] SongForm フォーメーションビルダー（ポジション別メンバー追加・並び替え・センター指定）
- [x] 楽曲公開ページ（一覧 + グループフィルタ / 詳細 + フォーメーション表示）
- [x] Supabase マイグレーション実行（006, 007）
- [x] RPC 関数本体の `public.` スキーマ修飾修正（007）

#### 未完了

- [ ] メンバー詳細ページに参加楽曲セクション追加

### リリース作品

| テーブル（想定） | 説明 |
|---|---|
| `orbit_releases` | リリース作品（type: single/album/DVD, リリース日, 初週売上等） |

- シングル/アルバム/映像作品の管理

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
| middleware 非推奨警告 | Next.js 16 で `middleware.ts` が deprecated | middleware 削除時に `proxy.ts` に移行 |
| Repository update 非アトミック | update の全削除→再挿入がトランザクションなし | RPC 関数でトランザクション化 |
| `UpdateXxxInput = CreateXxxInput` | 部分更新不可（全フィールド送信が必要） | フォームは常に全フィールド送信するため当面問題なし |
