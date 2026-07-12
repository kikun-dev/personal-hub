# AI協調ルール

## 役割分担

- Claude（Claude Code）：設計 + 実装（リファクタリングの実装を含む）
- Codex：レビュー（リファクタリングの提案を含む）。
  例外的に、Claude またはユーザーから明示指示された場合に限り実装も担う
  （下記の共用実装スキルを使う。設計判断が未確定の Issue は Decision を確定してから着手する）

### 共用実装スキル

実装の定型手順は `.claude/skills/` と `.agents/skills/` に**同一内容**で置く（共用スキル）:
`issue-start`（着手）/ `refactor`（振る舞い不変のリファクタ実装）/ `migration`（DB変更）/
`pr`（PR作成）/ `doc-sync`（ドキュメント同期）。
片方を変更したらもう片方も同期する（`doc-sync` の同期チェックマップに従う）。

---

## ワークフロー

1. Issueを起点に作業開始
2. ClaudeがIssueで設計提案・Decisionを明示
3. Claudeが実装しPRを作成（Issueにリンク）
   - 例外的に、Claude またはユーザーから明示指示された場合に限り Codex が実装・PR作成を担う
   - Codexレビューを依頼する場合のみ `@codex review` をbodyに記載する（任意。依頼しないPRも多い）
4. （Codexレビューを依頼した場合）Codexがレビューし、指摘をPRコメントに残す
5. Claudeがレビュー指摘を修正し、PRに対応サマリーをコメント
   - 再レビューを依頼する場合のみ `@codex review` を添える
6. 指摘がなくなるまで 4-5 を繰り返す
7. レビュー完了後マージ

### Sakalog の UI・デザイン作業

- `apps/oshikatsu-web` の UI / UX に関係する作業は `rules/sakalog.md` に従う
- `apps/oshikatsu-web/PRODUCT.md` はプロダクト目的・利用者・価値の正典、
  `apps/oshikatsu-web/DESIGN.md` は段階的に目指す Target Design System の正典とする
- UI 変更は Issue の Acceptance Criteria と Decision の範囲に限定し、
  Target Design System を段階的に適用する
- critique / audit / redesign は Issue スコープに明記された場合のみ行う
- DESIGN.md と既存 UI の差を、差分外の既存 UI 改善要求へ広げない

役割は以下のように分離する:

- Product Design: UX、Visual Direction、Visual Target との Design QA
- Impeccable: Design Context、UI 設計、監査、仕上げ
- Claude: Issue Decision に基づく設計・実装
- Codex `pr-review`: セキュリティ、設計整合性、パフォーマンス、将来拡張性を扱う従来のコードレビュー

Product Design の Design QA、Impeccable の監査、Codex `pr-review` は相互に代替しない。
`.impeccable/*` の生成・ツール設定ファイルは補助情報として扱い、
`PRODUCT.md` / `DESIGN.md`、Issue Decision、`rules/`、ADR を上書きしない。

### Codexレビュー対応の手順

1. `gh api` でPRのレビューコメントを確認する
2. 指摘内容を把握し、コードを修正する
3. typecheck / lint を通過させる
4. 修正を commit & push する
5. PRに以下を含むコメントを追加する:
   - 修正内容のサマリー（指摘の優先度ラベル付き）
   - `@codex review`（再レビュー依頼）

---

## 原則

- 設計議論はIssueで行う（PRでは行わない）
- 構造変更やライブラリ追加はDecisionを残す
- リファクタは原則として振る舞い不変
- 振る舞い変更がある場合はIssueへ戻す

---

## 目的

- 設計の履歴をIssueに集約する
- PRは実装ログとして簡潔に保つ
- 長期的に迷わない構造を維持する
