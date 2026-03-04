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

- [ ] Supabase で SQL マイグレーション実行（001〜003）
- [ ] PR #29 レビュー・マージ
- [ ] Vercel デプロイ設定（oshikatsu-web）
- [ ] Supabase Dashboard で本番 Redirect URL 追加
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

- [ ] Supabase で SQL マイグレーション実行（004）

### 残タスク（バリデーション強化）

- [ ] テキストフィールドの最大長チェック追加（P1: DB 側も TEXT 制約なし）
- [ ] `validateEvent` で `endDate >= date` チェック追加（P1）
- [ ] `heightCm` の範囲チェック追加（P1: 0 < x < 300）
- [ ] `bloodType` のサーバーサイドバリデーション追加（P2）
- [ ] `dateOfBirth` のフォーマットバリデーション追加（P2）

### 残タスク（コード品質）

- [ ] `GROUP_COLORS` 定数の使用状況確認・整理（P2: DB カラーと重複の可能性）
- [ ] `groupRepository`, `eventTypeRepository` の `select("*")` を明示的カラム指定に変更（P2）
- [ ] Repository update の非アトミック操作を RPC 関数でトランザクション化（P1: create は補償処理済み）
- [ ] Issue #27 の改善項目（Supabase 共有パッケージ）

---

## Phase 2: コンテンツ拡充

### 楽曲データベース

| テーブル（想定） | 説明 |
|---|---|
| `orbit_songs` | 楽曲（タイトル, 作詞, 作曲, リリース日） |
| `orbit_song_members` | 楽曲×メンバー（ポジション: センター/フロント/アンダー 等） |

- 楽曲一覧・詳細ページ
- メンバー詳細ページに参加楽曲セクション追加

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
