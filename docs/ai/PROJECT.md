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
- フロントエンド：Next.js（App Router） + TypeScript
- パッケージ管理：npm
- リポジトリ：GitHub（private）
- IDE：VS Code（Remote WSL）

---

## 4. モノレポ構成

personal-hub/
  apps/
    household-web
    oshikatsu-web
    tasks-web
  packages/
  docs/
  CLAUDE.md


- 各アプリは独立した Next.js アプリとして存在する
- 将来的に共通パッケージ（packages配下）を導入する可能性あり

---

## 5. 設計方針

- 可読性を最優先する
- 境界（フォーム・API・外部入力）では必ずバリデーションを行う
- UI / ドメイン / データ層の責務を明確に分離する
- 小さなPR単位で変更する
- 早すぎる最適化は行わない

---

## 6. 現時点で未決定の事項

以下はこれから Claude Code と設計する：

- データ保存戦略（ローカルDB / クラウド / ハイブリッド）
- マルチ端末同期の方法
- 認証の有無
- API層の分離有無
- 共通ドメインパッケージの設計
- 状態管理戦略

---

## 7. 非目標（現時点ではやらないこと）

- CI構築
- Docker導入
- 本番デプロイ戦略決定
- パフォーマンス最適化

これらは設計完了後に検討する。