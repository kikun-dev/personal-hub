# Design Audits

Product DesignとImpeccableによる監査を統合した、正式なDesign Audit記録の索引と運用ルール。

## Audits

| Date | Product | Scope | Report |
|---|---|---|---|
| 2026-07-13 | Sakalog | トップページからイベント詳細までの主要閲覧フロー | [Report](./2026-07-13-sakalog-primary-flow.md) |
| 2026-07-15 | Sakalog | #343〜#347実装後のPrimary Journey Integrated Design QA | [Design QA](./2026-07-15-sakalog-primary-journey-design-qa.md) |
| 2026-07-15 | Sakalog | #343〜#347実装後のPrimary Journey Impeccable Technical Audit | [Technical Audit](./2026-07-15-sakalog-primary-journey-technical-audit.md) |
| 2026-07-16 | Sakalog | #343〜#347実装後のPrimary Journey Consolidated Findings / Roadmap | [Consolidated Findings](./2026-07-16-sakalog-primary-journey-consolidated-findings.md) |
| 2026-07-19 | Sakalog | #365 / #366完了後のDaily Story Top Page read performance | [Performance Audit](./2026-07-19-sakalog-daily-story-top-page-read-performance-audit.md) |
| 2026-07-19 | Sakalog | #383 Top Page bounded readの実DB execution plan検証（validation-only完了） | [Plan Validation](./2026-07-19-sakalog-top-page-db-execution-plan-validation.md) |
| 2026-07-20 | Sakalog | #357 / #363 / #376 / #377 Live Detail direct fallback carousel Focused Design QA | [Focused Design QA](./2026-07-20-sakalog-live-detail-carousel-focused-design-qa.md) |
| 2026-07-20 | Sakalog | #361 / #362 Calendar primary date exploration Focused Design QA | [Focused Design QA](./2026-07-20-sakalog-calendar-primary-date-exploration-focused-design-qa.md) |

2026-07-15〜16の3 reportは、2026-07-13 Auditを置換しない実装後follow-up snapshotである。Consolidated Findingsに示す13件のRecommended Issue Boundariesは未起票であり、Issue Decisionまたは確定仕様ではない。

次回のfinal Performance Auditは、#382で追加したshared cache contract test（`orbitReadLoader.test.ts` / `readOrbitMusicData.cache.test.ts`）がunit suiteに含まれpassしていることを実行条件とする。2026-07-19 Auditの`Shared cache enabled-path contract`未実施（Verification Record）は、この条件を満たすことで解消される。

## Audit Flow

1. Product Design Audit
2. Impeccable Critique
3. Impeccable Technical Audit
4. Consolidated Findings
5. Recommended Roadmap
6. Issue Decision
7. 実装
8. Design QA / 再監査

## Document Roles

- **Product Design Audit**: 主要フローをユーザー目的、情報設計、認知負荷、アクセシビリティの観点から評価する。
- **Impeccable Critique**: UIの階層、明瞭さ、一貫性、感情的体験を独立して批評する。
- **Impeccable Technical Audit**: Accessibility、Performance、Theming、Responsive Design、Anti-Patternsをコードレベルで検証する。
- **Consolidated Findings**: Product Design / Critique / Technical Auditの指摘を根本原因単位で統合する。
- **Recommended Roadmap**: 統合Findingを依存関係と改善効果に基づいて並べる。確定した実装計画ではない。
- **Issue Decision**: Findingの採否、優先度、変更範囲を決定し、実装可能な単位へ分割する。

関連文書と保存場所の役割は次のとおり。

- `docs/advisor/design/`: Product DesignとImpeccableを統合した正式なDesign Audit記録。
- `.impeccable/critique/`: Impeccableが生成するCritiqueのスナップショット。正式な統合監査記録の代替ではない。
- `PRODUCT.md`: Product Purpose、ユーザー価値、成功条件の正典。
- `DESIGN.md`: UI仕様、デザインシステム、アクセシビリティ基準の正典。
- Issue: 改善の採否、優先度、実装範囲を決めるIssue Decisionの記録。

## Storage Policy

- 監査レポートは原則として監査時点のスナップショットとして保存し、後続実装や次回監査の結果で既存レポートを上書きしない。
- ファイル名は `YYYY-MM-DD-<product>-<scope>.md` とする。
- 再監査は新しい日付のレポートとして追加し、本READMEのAudit一覧を更新する。
- 監査指摘へ対応した場合は、既存レポートのFindingやScoreを現在状態へ書き換えず、Related Issuesへの追跡情報追加または再監査レポートで結果を記録する。

## Decision Boundary

FindingとRecommended Roadmapは、改善判断の材料であり確定仕様ではない。採否と変更範囲はIssue Decisionで決定する。Design Auditは`PRODUCT.md`、`DESIGN.md`、Issue Decisionを上書きしない。
