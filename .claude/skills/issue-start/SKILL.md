---
name: issue-start
description: GitHub Issueを起点に実装を開始する。「#123に着手」「Issue #123を始めて」「この Issue やって」などで使う。Issue読解→設計確認（Decision未確定なら確定を促す）→ブランチ作成→層ごとの実装計画の提示まで行う。
argument-hint: "<Issue番号>"
---

# Issue 着手（実装前作業計画）

`CLAUDE.md` の「Plan → Design → Implement → Verify」の入口部分を実行する。
このスキルの完了時点は「実装を始められる状態」であり、実装そのものはこの後に続ける。

## 手順

### 1. Issue の読解と文脈収集

- `gh issue view <N>` で本文・ラベル・コメントを読む
- 本文が参照するドキュメント（`docs/advisor/`、ADR、roadmap）と関連 Issue（前提・後続）を読む
- 前提 Issue が未完了の場合は、着手可能かユーザーに確認する

### 2. 設計の確認（Design notes / Decision）

- Issue に Design notes（Options / Recommendation / Trade-offs）があり **Decision が空欄**の場合:
  - 推奨案と根拠を提示し、ユーザーに決定を求める
  - 決定したら `gh issue edit` で Issue の Decision 欄に追記する（設計の一次情報は Issue に残す — `rules/process.md`）
- Design notes が無いが設計判断が必要な変更（新規ライブラリ・層構造・データモデル・重要 UX）の場合:
  - 設計提案フォーマット（`CLAUDE.md`）で Options を整理し、Issue に追記してから進める
- 設計判断が不要な単純な変更なら、このステップはスキップする

### 3. 実装パターンの下調べ

- `rules/architecture.md` / `rules/implementation.md` の制約を確認する
- 類似の既存実装を探し、従うべきパターンを特定する
  （例: CRUD 追加なら既存ドメインの types → repository → usecase → actions → form の一式、
  DB 変更なら `/migration` スキルの手順、キャッシュ失効なら `lib/revalidateOrbit.ts` のパターン）

### 4. ブランチ作成

- `git fetch origin main` 後、`origin/main` から作成する
- 命名規約: `feature/<Issue番号>-<kebab-slug>`（例: `feature/207-video-calendar-events`）
- バグ修正は `fix/<Issue番号>-<slug>`

### 5. 実装計画の提示

以下を含む計画を会話で提示する（長大な計画を Issue に貼らない。設計判断だけ Issue に残す）:

- **実装順序**: 依存方向に沿って下から（migration → types → repository → usecase → UI/actions → キャッシュ失効）
- **変更ファイル一覧**（見込み）と各変更の要点
- **検証計画**: typecheck / lint + 手動確認手順（Issue の Acceptance Criteria と対応させる）
- **PR 分割方針**: 差分が大きくなる場合はどこで切るか（1変更1責務）
- 計画に対する仮定・不確定要素を明示する

## 完了条件

- Decision が確定している（または不要と判断した理由を明示している）
- 作業ブランチが作成されている
- Acceptance Criteria と対応した実装計画が提示されている
