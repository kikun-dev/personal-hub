---
name: pr
description: プロジェクトのPRテンプレートに沿ってPull Requestを作成する。「PR作って」「PRにして」「プルリク作成」などで使う。ブランチ確認→typecheck/lint→日本語本文（Closes #N）→gh pr createまで一括で行う。
argument-hint: "[関連Issue番号] [--codex] [--draft]"
---

# PR 作成

`.github/PULL_REQUEST_TEMPLATE.md` に沿って PR を作成する。
`rules/ai-collaboration.md` のワークフロー手順3の実行版。

## 引数

- `関連Issue番号`（省略可）: 省略時はブランチ名（例: `feature/207-...`）や会話の文脈から特定する。特定できなければユーザーに確認する
- `--codex`（省略可）: PR body に `@codex review` を記載して Codex レビューを依頼する。
  **デフォルトでは付けない**（依頼しない PR が多いため）
- `--draft`（省略可）: `gh pr create --draft` でドラフト PR として作成する

## 手順

### 1. 事前チェック

- カレントブランチが `main` でないことを確認する。`main` にいる場合は作業ブランチを切ってから進める
- 未コミットの変更がないか `git status` で確認する。あればユーザーに確認してからコミットする
- ベースブランチ（`main`）との差分（`git log main..HEAD --oneline` と `git diff main --stat`）で PR に載る内容を把握する

### 2. 検証

- 差分に含まれるアプリに対して typecheck / lint を実行する（`rules/implementation.md`）
  - `pnpm --filter oshikatsu-web typecheck && pnpm --filter oshikatsu-web lint`
  - `pnpm --filter household-web typecheck && pnpm --filter household-web lint`
- `packages/` に差分がある場合は依存する両アプリで実行する
- 失敗したまま PR を作らない

### 3. 本文の組み立て

`.github/PULL_REQUEST_TEMPLATE.md` の全セクションを日本語で埋める:

- **Why / Background**: 関連 Issue の背景を要約
- **What / Summary**: ユーザー視点の箇条書き
- **Scope / Impact**: 影響する画面・API・データ / 影響しないもの / 破壊的変更の有無
- **Related Issues**: `Closes #N`（必須。PR は必ず Issue を参照する — `rules/process.md`）
- **DB / Migration**: DB 変更があるときだけ記載。無ければセクションごと「変更なし」と明記
- **Test Plan**: 実施した検証を正直に書く。未実施項目は理由付きで「未実施」とする
  （実行していないテストを「通った」と書かない）
- **Screenshots**: UI 変更時のみ
- **Review Notes**: 見てほしい点を優先順に
- **Checklist**: 各項目を実際に確認してからチェックする
- テンプレート末尾のフッター行（🤖 Generated with Claude Code / ✅ Human-checked）は残す

`--codex` フラグが渡された場合のみ、本文の Related Issues の後に `@codex review` を1行追加する。
フラグがない場合は付けない。

### 4. PR 作成

- push 済みでなければ `git push -u origin <ブランチ名>`（force push はしない）
- 本文は scratchpad に書き出し、`gh pr create --title "<タイトル>" --body-file <ファイル>` で作成する
- タイトルはコミット規約に合わせた日本語（例: `feat: カレンダーに動画イベントを表示する`）
- 作成後は PR URL を提示する

## 完了条件

- typecheck / lint が通った状態で PR が作成されている
- 本文がテンプレート準拠で、`Closes #N` を含む
- `--codex` 指定時のみ `@codex review` が記載されている
