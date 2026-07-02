# personal-hub（正典ドキュメント）

## 1. ビジョン

personal-hub は、日常生活を支える複数アプリを統合する
個人専用のプラットフォームである。

主目的は収益化ではなく、
長期的に自分が使い続けられる基盤を構築すること。

保守性・拡張性・読みやすさを重視する。

---

## 2. アプリ構成（技術名 → ブランド名）

- household-web → Ledger（家計管理）
- oshikatsu-web → Orbit（推し活管理）
- tasks-web → Flow（タスク管理）

すべて Next.js ベースの Web アプリとして構成する。

---

## 3. 現在の技術スタック

- OS：Windows 11 + WSL2（Ubuntu）
- Node：24（.nvmrc にて固定）
- フロントエンド：Next.js 16（App Router） + TypeScript + Tailwind CSS 4
- パッケージ管理：pnpm（workspaces）
- データベース + 認証：Supabase（PostgreSQL + Google OAuth + RLS）
- 状態管理：ライブラリなし（Server Components + useState + URL params）
- チャート：recharts（household-web で導入済み）
- リポジトリ：GitHub（private）
- CI：GitHub Actions（各アプリ配下の変更時に typecheck / lint / build）
- デプロイ：Vercel（household-web / oshikatsu-web）
- IDE：VS Code（Remote WSL）

---

## 4. モノレポ構成

```
personal-hub/
  apps/
    household-web/        ← Ledger（実装済み・デプロイ済み）
    oshikatsu-web/        ← Orbit（継続実装中）
    tasks-web/            ← Flow（未着手）
  packages/
    supabase/             ← @personal-hub/supabase（認証・DB クライアント共有）
  docs/
    ai/                   ← AI向けドキュメント
    advisor/              ← 外部/全体レビューと改善計画
    decisions/            ← ADR（設計判断記録）
  rules/                  ← プロジェクトルール
  .github/                ← Issue/PRテンプレート、CI
  CLAUDE.md
```

- 各アプリは独立した Next.js アプリとして存在する
- `packages/supabase` は認証・DB クライアントの共有パッケージ（PR #26 で導入済み）

---

## 5. household-web（Ledger）の現状

### 機能
- **支出記録**（支出のみ。収入は管理しない）
- **推し活モード**（通常支出と推し活支出を切り替え可能）
  - 推し活時はカテゴリ不要、代わりにグループ名 + 活動タイプを指定
  - グループ名：乃木坂46, 櫻坂46, 日向坂46, その他（固定選択式）
  - 活動タイプ：11種類（ライブ・コンサート、グッズ購入 等）
- **ダッシュボード**（月次サマリー + 取引一覧）
- **取引編集・削除**
- **Google ログイン**

### アーキテクチャ（3層）
```
app/（UI層）→ usecases/（UseCase層）→ repositories/（Data層）
                                         ↓
                                    Supabase (PostgreSQL)
```

### DB テーブル
- `transactions` — 取引（type は常に "expense"、category_id は nullable）
- `categories` — カテゴリ（システムデフォルト + ユーザーカスタム）
- `payment_methods` — 支払い方法（現金, クレカ×3, QR決済, 口座振替, その他）

### 支払い方法
現金, クレカ(三井住友NL), クレカ(楽天), クレカ(ヨドバシ), QR決済, 口座振替, その他

---

## 6. oshikatsu-web（Orbit）の現状

### 主な機能
- **トップページ**（月間カレンダー + 今日のイベント + 今日はなんの日）
  - 通常イベント、誕生日、ライブ公演日、リリース日、MV/関連動画の配信日を集約表示する
- **メンバー一覧**（カードグリッド + グループ/ステータスフィルター）
- **メンバー詳細**（プロフィール + グループ履歴 + 来歴 + 参加楽曲 + シングル別選抜ポジション）
- **楽曲/リリース管理**（リリース中心モデル、クレジット、フォーメーション、MV、関連動画、衣装）
- **ライブ/会場/セットリスト管理**（公演、出演メンバー、披露メンバー、披露タイプ）
- **制作陣管理**（人物マスタ、担当 role、担当楽曲一覧）
- **管理画面**（メンバー/イベント/制作陣/リリース/楽曲/ライブ/会場 CRUD）
  - メンバー画像は Supabase Storage へアップロードし、`orbit_members.image_url` には object path を保持
  - 来歴はイベント管理で `is_member_history` を付与して管理（メンバー画面側での来歴入力は廃止）
- **Google ログイン**

### アーキテクチャ（3層）
household-web と同パターン。Repository に `userId` パラメータなし（グローバルデータ）。

### 閲覧導線の運用メモ
- 認証ガードは `proxy.ts` 側に集約する
- 閲覧系は read model 経由で取得し、`SUPABASE_SERVICE_ROLE_KEY` がある環境では shared cache を有効化する
- キーがない環境ではセッション付き server client にフォールバックし、機能優先で動作させる
- Top は集約 usecase で取得し、誕生日 / OnThisDay は 1 往復 RPC を優先する
- 公開一覧は `findAll` とは別に public list DTO を使い、一覧表示に不要な join を避ける
- メンバー/楽曲の一覧は、グループ絞り込みなしのとき `usecases/groupListSections.ts`（`createMemberSections` / `createSongSections`）でグループ別セクションに整形し、`GroupSectionHeading` + `*SectionList` / `*Grid` で表示する。グループ絞り込み時はフラットな `*Grid` にフォールバックする
- リリース一覧はグループ別セクションではなく、リリース日降順のフラット表示を基本とする
- 更新系は `updateTag` で `orbit:*` の top / list / detail tag を即時失効する

### 管理導線の運用メモ
- 編集対象本体はページ側の `createClient()` で取得し、即時性を優先する
- 候補マスタは `readOrbitAdminData.ts` 経由で取得し、共有可能なものだけ shared cache に載せる
- 管理フォームでは `findAll` / `findById` の重い payload を流用せず、option DTO を使う
- 制作陣更新は `people` だけでなく、関連する楽曲/リリース詳細キャッシュも失効する

### 楽曲/リリース管理の運用メモ
- 選抜ポジションは ADR 0007 に従い、選抜/アンダー/期別、列、センターを楽曲ラベルとフォーメーションから導出する
- リリース×メンバーで手動保持する選抜ポジション情報は、福神/休業中 overlay に限定する
- 櫻坂46 1st〜5th Single の櫻エイト期は、`label = title` の代表トラックを基準に特別ルールで導出する
- 休業中は参加登録を保持したまま、リリース詳細の表示・人数集計から除外する
- 関連動画は `dance_practice` / `call` を保持する。`dance_practice` は櫻坂46では「Dance Practice」、日向坂46では「ひなリハ」と表示し、乃木坂46では表示対象外にする

### 主要DBテーブル（`orbit_` プレフィクス）
- `orbit_groups` — グループ（successor_id で改名関係）
- `orbit_members` / `orbit_member_groups` / `orbit_member_sns` — メンバープロフィール、所属履歴、SNS
- `orbit_group_penlight_colors` — グループ別サイリウム色候補
- `orbit_event_types` / `orbit_events` / `orbit_event_groups` / `orbit_event_members` — イベント、グループ/メンバー紐づけ、来歴兼用イベント
- `orbit_people` — 制作陣マスタ
- `orbit_releases` / `orbit_release_tracks` / `orbit_release_members` / `orbit_release_bonus_videos` — リリース本体、収録曲、参加メンバー、特典映像
- `orbit_release_member_positions` — リリース×メンバーの選抜ポジション overlay（福神/休業中）
- `orbit_tracks` / `orbit_track_credits` / `orbit_track_formations` / `orbit_track_formation_rows` / `orbit_track_formation_members` / `orbit_track_mvs` / `orbit_track_videos` / `orbit_track_costumes` — 楽曲、クレジット、フォーメーション、MV、関連動画、衣装
- `orbit_venues` — 会場マスタ
- `orbit_lives` / `orbit_live_performances` / `orbit_live_performer_groups` / `orbit_live_performer_members` / `orbit_live_performance_absences` — ライブ、公演、出演/休演情報
- `orbit_setlist_items` / `orbit_setlist_item_members` — セットリスト、披露メンバー

### RLS 方針
グローバルデータのため、`app_metadata.role = 'admin'`（`public.is_orbit_admin()`）で判定する。ADR 0008 参照（Issue #213 対応済み）。
将来の匿名公開時は、公開対象の SELECT ポリシーだけを広げる。

### 今後の予定
`docs/orbit-roadmap.md` を参照。主要な設計判断は ADR 0005〜0007。
全体レビューと改善計画は `docs/advisor/006-oshikatsu-web-current-state-audit.md` を参照。

---

## 7. 設計方針

- 可読性を最優先する
- 境界（フォーム・API・外部入力）では必ずバリデーションを行う
- UI / ドメイン / データ層の責務を明確に分離する
- 小さなPR単位で変更する
- 早すぎる最適化は行わない

---

## 8. 決定済みの設計判断（ADR）

| ADR | タイトル | 状態 |
|---|---|---|
| 0001 | 基本アーキテクチャとAI分担方針 | Accepted |
| 0002 | Supabase の採用（DB + 認証） | Accepted |
| 0003 | 状態管理方針 | Accepted |
| 0004 | チャートライブラリ（recharts）採用 | Accepted |
| 0005 | Orbit Phase 1 設計 | Accepted |
| 0006 | Orbit 閲覧導線の read cache 戦略 | Accepted |
| 0007 | Orbit 選抜ポジションのフォーメーション一元管理 | Accepted |

---

## 9. 非目標（現時点ではやらないこと）

- Docker 導入
- パフォーマンス最適化の先回り実装

これらは設計完了後に検討する。
