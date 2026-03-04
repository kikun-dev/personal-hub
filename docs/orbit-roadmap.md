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

## Phase 1.5: 改善・安定化

- [ ] カレンダー月切り替え時のサーバーデータ再取得（現在はクライアント側のみ）
- [ ] 誕生日/OnThisDay クエリの RPC 関数化（データ量増加時）
- [ ] `next/image` への移行（外部ドメイン設定が必要）
- [ ] メンバー一覧のソート強化（現役→OG、期生順）
- [ ] Header のモバイル対応（ハンバーガーメニュー等）
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
| `<img>` 使用 | lint warning あり。外部 URL のみ対応 | Phase 1.5 で `next/image` に移行 |
| 全件取得フィルタ | 誕生日/OnThisDay で全メンバー/全イベントを取得 | データ量増加時に RPC 関数に移行 |
| カレンダー月切り替え | クライアント側のみ。データは初期ロード時の月のみ | Phase 1.5 で Server Action or API Route で対応 |
| middleware 非推奨警告 | Next.js 16 で `middleware.ts` が deprecated | middleware 削除時に `proxy.ts` に移行 |
