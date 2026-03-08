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
- デプロイ：Vercel（household-web デプロイ済み）
- IDE：VS Code（Remote WSL）

---

## 4. モノレポ構成

```
personal-hub/
  apps/
    household-web/        ← Ledger（実装済み・デプロイ済み）
    oshikatsu-web/        ← Orbit（Phase 1 実装済み・PR #29）
    tasks-web/            ← Flow（未着手）
  packages/
    supabase/             ← @personal-hub/supabase（認証・DB クライアント共有）
  docs/
    ai/                   ← AI向けドキュメント
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

### 機能（Phase 1）
- **トップページ**（月間カレンダー + 今日のイベント + 今日はなんの日）
- **メンバー一覧**（カードグリッド + グループ/ステータスフィルター）
- **メンバー詳細**（プロフィール + グループ履歴 + 来歴）
- **管理画面**（メンバー CRUD + イベント CRUD）
  - メンバー画像は Supabase Storage へアップロードし、`orbit_members.image_url` には object path を保持
  - 来歴はイベント管理で `is_member_history` を付与して管理（メンバー画面側での来歴入力は廃止）
- **Google ログイン**

### アーキテクチャ（3層）
household-web と同パターン。Repository に `userId` パラメータなし（グローバルデータ）。

### DB テーブル（`orbit_` プレフィクス）
- `orbit_groups` — グループ（5件。successor_id で改名関係）
- `orbit_members` — メンバープロフィール
- `orbit_member_groups` — メンバー×グループ（多対多）
- `orbit_event_types` — イベント種別（10件）
- `orbit_events` — イベント（`is_member_history` フラグで来歴兼用）
- `orbit_event_groups` — イベント×グループ
- `orbit_event_members` — イベント×メンバー

### RLS 方針
グローバルデータのため `auth.role() = 'authenticated'` で統一。
将来の公開時は SELECT を `true` に変更するだけ。

### 今後の予定
`docs/orbit-roadmap.md` を参照。設計判断は ADR 0005。

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

---

## 9. 非目標（現時点ではやらないこと）

- Docker 導入
- パフォーマンス最適化

これらは設計完了後に検討する。
