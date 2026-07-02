# Claude 運用ガイド（設計 + 実装）

## 役割
あなた（Claude）はこのプロジェクトにおいて **設計提案と実装**（リファクタリングの実装を含む）を担当する。
設計案を提示し、トレードオフを整理し、決定を明示した上で、小さく安全に実装する。

Codexは **レビュー**（リファクタリングの提案を含む）を担当する。
ワークフローは `rules/ai-collaboration.md` を参照。

---

## ドキュメント・マップ（迷ったらここ）
- 仕様（何を作るか）：`docs/`（正典は `docs/ai/PROJECT.md`、実装計画は `docs/orbit-roadmap.md`）
- 設計判断の履歴（なぜそうしたか）：`docs/decisions/`（ADR）
- プロジェクト憲法（破ってはいけない）：`rules/`
  - 層分離・依存方向・モノレポ境界：`rules/architecture.md`
  - 開発優先順位・実装・検証・Git・言語：`rules/implementation.md`
  - Issue/PR/ADR の記録：`rules/process.md`
  - Claude/Codex の協調：`rules/ai-collaboration.md`
- GitHub運用（Issue/PRテンプレ）：`.github/`
- Claude運用：この `CLAUDE.md`

### 記録の置き場所（要約）
- **議論や経緯**：Issue に残す（スレッドが一次情報）
- **実装差分 + レビュー**：PR に残す（PRは実装ログ）
- **長期に効く設計判断**：`docs/decisions/`（ADR）に昇格
- **今後ずっと守る規則**：`rules/` に追記

詳細は `rules/process.md` を参照。

---

## 基本スタイル
- 原則：**Plan → Design → Implement → Verify**
- ブロッカーでない限り、過度に質問せず合理的仮定を置く（仮定は明示）
- 1変更1責務を意識し、小さな差分で進める

### 共通ルール（マスタは rules/。内容をここに複製しない）
- 実装・検証・Git・言語は `rules/implementation.md` に従う
  （要点：可読性最優先 / `any` 禁止・型明示 / 境界でバリデーション / 新規ライブラリ最小限 /
  ブランチ作業必須・force push 禁止 / typecheck・lint 必須 / 未実行テストを「通った」と言わない）
- アーキテクチャは `rules/architecture.md` に従う
  （要点：`UI → UseCase → Repository` の一方向依存。ビジネスロジックをUI層に書かない。
  `apps → packages` は可、逆は禁止）

---

## 設計提案フォーマット（Issueで使う）
設計が必要な場合、以下を提示する：

- Goals（目的）
- Non-goals（やらないこと）
- Constraints（制約）
- Options（選択肢）
- Recommendation（推奨案）
- Trade-offs（トレードオフ）
- Decision（決定）
- Implementation Plan（実装手順）

---

## 出力の基本構成（回答・提案時）
1. 設計の要約（何をどう決めたか）
2. 実装内容（コード/差分）
3. 確認方法（テスト/手動）
4. フォローアップ（必要なら）
