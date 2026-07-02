---
name: codex-review
description: PRのレビューコメント（Codex含む）への対応サイクルを実行する。コメント取得→修正→検証→push→対応サマリーコメントまでを一括で行う。「レビュー対応して」「レビューコメントに対応」「Codexの指摘を直して」などで使う。
argument-hint: "[PR番号] [--codex]"
---

# レビュー対応サイクル

PR のレビューコメントに対応し、修正 → 検証 → push → 対応サマリーコメントまでを行う。
`rules/ai-collaboration.md` の「Codexレビュー対応の手順」の実行版。

## 引数

- `PR番号`（省略可）: 省略時はカレントブランチの PR を `gh pr view --json number,url` で特定する
- `--codex`（省略可）: 対応サマリーコメントの末尾に `@codex review`（再レビュー依頼）を付ける。
  **デフォルトでは付けない**（最近は Codex レビューを使わない PR が多いため）

## 手順

### 1. PR とレビューコメントの取得

```bash
# PR特定（引数がない場合）
gh pr view --json number,url,title,headRefName

# レビューコメント（コードに紐づくもの）
gh api repos/{owner}/{repo}/pulls/{PR番号}/comments

# レビュー本体・PR全体コメント
gh api repos/{owner}/{repo}/pulls/{PR番号}/reviews
gh api repos/{owner}/{repo}/issues/{PR番号}/comments
```

- 対応済みの指摘（過去の対応サマリーで言及済み）と未対応の指摘を区別する
- 未対応の指摘を優先度順に整理してから着手する

### 2. 指摘への対応

- 各指摘を `rules/`（architecture / implementation）と ADR に照らして妥当性を判断する
- 妥当な指摘は修正する。妥当でない・見送る指摘は理由を明確にする（サマリーに書く）
- 指摘の意図が不明瞭な場合は、推測で大きく変更せず、サマリーで確認を返す

### 3. 検証

- 変更したアプリに対して typecheck と lint を実行する（`rules/implementation.md`）
  - `pnpm --filter oshikatsu-web typecheck && pnpm --filter oshikatsu-web lint`
  - `pnpm --filter household-web typecheck && pnpm --filter household-web lint`
- 失敗したまま次の手順へ進まない

### 4. commit & push

- コミットメッセージは簡潔に要約（例: `fix: レビュー指摘対応（null安全化・命名修正）`）
- force push はしない

### 5. 対応サマリーコメント

PR に日本語でコメントを投稿する。書式:

```markdown
## レビュー対応サマリー

| 指摘 | 優先度 | 対応 |
|------|--------|------|
| <指摘の要約> | High/Mid/Low | ✅ 修正済み: <内容> |
| <指摘の要約> | Low | ⏭️ 見送り: <理由> |
```

- `--codex` フラグが渡された場合のみ、末尾に `@codex review` を1行追加する
- フラグがない場合は付けない

## 完了条件

- 未対応の指摘がすべて「修正済み」か「見送り（理由付き）」になっている
- typecheck / lint が通っている
- 対応サマリーが PR に投稿されている
