# Sakalog AI Development Rules

`apps/oshikatsu-web`（Sakalog）で作業する AI エージェント向けのアプリ固有ルール。
共通ルールは `rules/`、長期判断は ADR を正とし、このファイルは Sakalog で参照すべき正典と
既存の技術制約を案内する。

## 適用範囲

- `apps/oshikatsu-web/**` の設計・実装・レビューに適用する
- 共通のアーキテクチャ、実装、プロセス、協業ルールはそれぞれ
  `rules/architecture.md`、`rules/implementation.md`、`rules/process.md`、
  `rules/ai-collaboration.md` に従う
- このファイルと共通ルールまたは ADR が衝突する場合は、共通ルールと ADR を優先する

## 作業ディレクトリ（cwd）

- Sakalog の UI / UX を設計・実装する Claude Code / Codex セッションは、
  `apps/oshikatsu-web` を cwd として起動する
- これにより、Impeccable Hook が Sakalog 固有の `PRODUCT.md` / `DESIGN.md` と
  `.impeccable/design.json` を同じプロジェクト文脈として解決できる状態を保つ
- `/issue-start`、ブランチ・PR操作、`pr-review`、`doc-sync` などリポジトリ全体を扱う作業は、
  従来どおり personal-hub ルートを cwd として実行する
- Sakalog の UI / UX Issue では、ルートで Issue 着手と実装計画を行い、
  UI / UX 実装セッションを `apps/oshikatsu-web` cwd で開始することを計画へ明記する
- ルート cwd で子アプリの `DESIGN.md` が Hook に自動解決されない場合も、
  Impeccable 本体、Global Skill、Hook script、独自 wrapper は変更しない

## 正典ごとの役割

正典は単純な一列の優先順位ではなく、それぞれ異なる対象を決める。

| 正典 | 役割 |
|---|---|
| `rules/` | リポジトリ全体で守る共通ルール |
| `docs/decisions/`（ADR） | 長期的に維持する設計判断と、その判断理由 |
| `docs/ai/PROJECT.md` | 現在実装されている機能、技術構成、運用上の事実 |
| `apps/oshikatsu-web/PRODUCT.md` | Sakalog のプロダクト目的、利用者、提供価値、Design Principles |
| `apps/oshikatsu-web/DESIGN.md` | 新規 UI と段階的な既存 UI 改善で目指す Target Design System |
| `docs/advisor/design/` | Product DesignとImpeccableを統合したDesign Auditの時点記録 |
| Issue の Decision | 現在の変更で採用する設計判断と変更範囲 |
| `docs/orbit-roadmap.md` | 実装計画、進捗、技術的負債、既知の制限 |

- 現在の変更では、Issue の Acceptance Criteria と Decision をスコープの正とする
- Issue Decision は共通ルールや Accepted ADR を暗黙に上書きしない。衝突する場合は実装を止め、
  Issue で解消し、必要なら ADR を更新する
- `docs/advisor/design/`のFindingとRecommended Roadmapは確定仕様ではなく、`PRODUCT.md`、
  `DESIGN.md`、Issue Decisionを上書きしない
- 正典同士で対象領域が重なり、内容が矛盾する場合は推測で決めず Issue に戻す

## Product / UI / UX の変更

- UI / UX に関係する Issue では、実装前に `PRODUCT.md` と `DESIGN.md` を読む
- `DESIGN.md` は既存 UI の完全な写像ではなく、段階的に目指す Target Design System として扱う
- `DESIGN.md` と既存 UI の差は、無関係な Issue で既存 UI を変更する根拠にしない
- UI 変更では、Acceptance Criteria と Decision の範囲に限って Target Design System を段階的に適用する
- Product Purpose を変える Decision では、`PRODUCT.md` の更新要否を確認する
- Target Design System を変える Decision では、`DESIGN.md` と
  `.impeccable/design.json` を所定の生成フローで同期する
- critique / audit / redesign、Visual Target との Design QA は、
  `rules/ai-collaboration.md` に定める専用フローへ分離する

### Design Auditの保存と利用

SakalogのDesign Auditは原則として次の流れで行う。

Product Design Audit
→ Impeccable Critique
→ Impeccable Technical Audit
→ Consolidated Findings
→ Recommended Roadmap
→ Issue Decision
→ 実装
→ Design QA / 再監査

- 統合した監査レポートは`docs/advisor/design/`へ時点スナップショットとして保存し、
  `docs/advisor/design/README.md`のAudit一覧へ追加する
- ファイル名は`YYYY-MM-DD-<product>-<scope>.md`とする
- FindingとRecommended Roadmapは改善判断の材料であり、確定仕様や確定実装計画ではない。
  採否、優先度、変更範囲はIssue Decisionで決定する
- 後続実装に合わせて過去レポートのFindingやScoreを現在状態へ書き換えない。
  対応状況はRelated Issuesへの追跡情報追加または新しい再監査レポートで記録する

## Sakalog 固有の技術ルール

### 命名と境界

- ユーザー向けブランド名は **Sakalog** とする
- 内部コード名、DB テーブル prefix、キャッシュタグ等の既存識別子は **orbit** を維持する
- `UI → UseCase → Repository` の依存方向を守り、Sakalog 固有のビジネスルールを UI に置かない
- アプリ固有コードは `apps/oshikatsu-web` に置き、共通化が必要な場合も
  `packages → apps` の逆依存を作らない

参照: `rules/architecture.md`、`docs/decisions/0005-orbit-phase1-design.md`

### 認証・認可・ユーザー別データ

- グローバルデータの閲覧は admin / viewer、書き込みは admin に限定する既存方針を維持する
- UI の表示制御だけを認可として扱わず、ページ、Server Action、RLS の各境界で既存ガードを使う
- ライブ参加記録などのユーザー別データはグローバルデータと分け、本人の行だけを扱う
- 新しいユーザー別データを追加する場合は、既存のグローバルデータ方針からの例外として
  Issue Decision と RLS を明示する

参照: `docs/decisions/0008-orbit-admin-role-authorization.md`、
`docs/decisions/0009-orbit-per-user-data.md`

### 閲覧・更新・キャッシュ

- 閲覧導線は既存の read model / read client を使い、service role を書き込みへ流用しない
- 公開一覧では一覧用 DTO を使い、詳細用の重い payload や不要な join を流用しない
- 更新時は影響する `orbit:*` の top / list / detail キャッシュタグを既存パターンで失効する
- 管理フォームの候補データは option DTO を使い、編集対象本体と候補マスタの取得責務を分ける

参照: `docs/decisions/0006-orbit-read-cache-strategy.md`、`docs/ai/PROJECT.md` §6

### ドメイン固有の判断

- 選抜ポジションはフォーメーションから導出し、手動保持は既存の overlay 用途に限定する
- 聖地スポットの種別は出来事側で表現し、スポット本体へ単一カテゴリを再導入しない
- Wiki コンテンツは DB と管理画面で管理し、ソースコードへ静的本文を戻さない
- DB 変更は `apps/oshikatsu-web/supabase/migrations/` とローカル Supabase 検証フローを使う

参照: `docs/decisions/0007-orbit-selection-position-from-formation.md`、
`docs/decisions/0010-orbit-seichi-map-google-maps.md`、
`docs/decisions/0011-orbit-wiki-pages-storage-and-rendering.md`、
`docs/decisions/0012-local-supabase-docker-environment.md`

## 検証

- コード変更時は `pnpm --filter oshikatsu-web typecheck` と
  `pnpm --filter oshikatsu-web lint` を実行する
- migration を変更した場合は migration Skill と CI の DB 検証手順にも従う
- UI / UX 変更の手動確認は Acceptance Criteria に対応させ、対象外の画面へ評価範囲を広げない
