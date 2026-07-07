# AGENTS.md

personal-hub で作業する AI エージェント（主に Codex）向けの運用ガイド。

## 1. 適用範囲と優先順位

- このファイルはリポジトリ全体に適用する。
- ルールが衝突する場合は、`rules/` と ADR（`docs/decisions/`）を優先する。

## 2. 役割分担（現在の運用）

- Claude（Claude Code）：設計 + 実装（リファクタリングの実装を含む）
- Codex：レビュー（リファクタリングの提案を含む）。
  ユーザーから指示された場合は実装も担う
- ワークフローと共用実装スキルの一覧は `rules/ai-collaboration.md` を参照。

## 3. 共通ルール（マスタは rules/。内容をここに複製しない）

- 層分離・依存方向・モノレポ境界：`rules/architecture.md`
  - 依存方向は `UI → UseCase → Repository` のみ。`apps → packages` は可、逆は禁止
- 開発優先順位・実装・検証・Git・言語ポリシー：`rules/implementation.md`
- Issue / PR / ADR の記録ルール：`rules/process.md`
- 技術スタックの正典：`docs/ai/PROJECT.md`
  （Next.js 16 / TypeScript / Tailwind CSS 4 / Supabase / pnpm workspaces）

## 4. 実装時の進め方（Codex 向け）

- 着手は `.codex/skills/issue-start/SKILL.md`、リファクタ実装は `.codex/skills/refactor/SKILL.md`、
  DB 変更は `.codex/skills/migration/SKILL.md`、PR 作成は `.codex/skills/pr/SKILL.md` の手順に従う
- これらは Claude と同一内容の共用スキル。手順を変更する場合は `.claude/skills/` 側も同期する

## 5. レビュー時の観点（Codex 向け）

- PR 差分の定型レビューは `.codex/skills/pr-review/SKILL.md` の手順・出力形式に従う
- `rules/` と ADR への準拠を確認する（依存方向・層責務・`any` 禁止・境界バリデーション）
- 指摘は PR コメントに残す。設計レベルの議論が必要なら PR ではなく Issue へ誘導する
- リファクタ提案は原則「振る舞い不変」の範囲で行い、振る舞い変更を伴う場合は Issue 化を提案する
- レビュー言語は日本語ベース（`rules/implementation.md` の言語ポリシーに従う）

## 6. 参照ドキュメント

- 全体像: `README.md`, `docs/ai/PROJECT.md`
- 現在の実装計画: `docs/orbit-roadmap.md`
- 全体レビューと改善計画: `docs/advisor/`
- 設計判断: `docs/decisions/*.md`
- Claude 向け運用文書（参考）: `CLAUDE.md`
