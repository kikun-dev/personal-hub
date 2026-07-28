# Implementation Rules（実装・検証・Git・言語）

役割（Claude / Codex）を問わず適用する共通ルール。
`CLAUDE.md` / `AGENTS.md` はこのファイルを参照する（内容を複製しない）。

---

## 開発優先順位

1. 可読性・保守性
2. 正しさ
3. テスト容易性
4. 差分の小ささ（リスク最小化）
5. パフォーマンス（必要な場合のみ）

---

## 実装ルール

- `any` は使わない（必要なら型を作る）
- 型は明示的に書く（推論に頼りすぎない）
- 関数は小さく保つ（長くなったら分割）
- 命名規則
  - boolean：`isX` / `hasX` / `canX`
  - バリデーション：`validateX`
- 入力境界（フォーム・API・外部入力）で必ずバリデーションする
- エラーハンドリング
  - ユーザー向け：行動できるメッセージ
  - 技術的詳細：ログ側へ
- 新規ライブラリ追加は最小限（追加時は理由・代替案・影響を記録する）
- リファクタは原則として振る舞い不変で行う

---

## Git 運用

- 作業は必ずブランチで行う
- `main` へ直接 push しない（PR + CI 前提）
- force push はしない
- コミットメッセージは簡潔に要約する

---

## 検証ルール

- 変更したアプリに対して、少なくとも typecheck と lint を実行する
  - `pnpm --filter oshikatsu-web typecheck` / `pnpm --filter oshikatsu-web lint`
  - `pnpm --filter household-web typecheck` / `pnpm --filter household-web lint`
- テストがある場合は更新し実行する。無い場合は手動確認手順を添える
- 実行していないテストを「通った」と言わない（未実行なら理由と共に明示する）

---

## テスト

### 純粋関数の unit test

- ドメインルール、値変換、reducer の状態遷移、境界値を対象にする
  - 主たる置き場所は `usecases/` / `lib/`
  - `components/` / `playwright/` 配下でも、**JSX を持たず React / Playwright ランタイムに
    依存しないモジュール**（例: `*FormValues.ts` のフォーム値生成・変換）は対象に含む。
    実装と密結合な値変換をテストのためだけに `lib/` へ移さない（#443）
- 置き場所は実装ファイルと同階層の colocated `*.test.ts`
- ランナーは Vitest。実行は `pnpm --filter <app> test:unit`
  - `pnpm --filter oshikatsu-web test:unit` / `pnpm --filter household-web test:unit`
- 新規実装・既存関数の変更時にテストを足す運用とし、既存全コードへの遡及はしない
- テスト対象の純関数は `next/*` や `server-only` などのserver専用importを
  import チェーンに巻き込まない（巻き込む場合はテスト対象から外す）

### React component test（Sakalog）

- `apps/oshikatsu-web` では、純粋関数テストだけでは配線を保証できない操作密度の高い
  Client Component を対象にする（#442 / #450）
  - 複数のユーザー操作と React state が連動する
  - 非同期処理の pending / success / failure / cancellation を表示へ反映する
  - disabled、通知、入力保持など、操作順序に依存する UI 契約がある
  - 操作後の role、accessible name、ARIA 状態を確認する必要がある
- 単純な表示専用コンポーネント、Server Component、repository、Server Action 本体は対象外
- CSS layout、D&D 座標、実ブラウザ focus、navigation、SSR / hydration、認証・認可、RLS、
  複数画面フローは Playwright で検証する。jsdom が実装しない挙動を大量の mock で再現しない
- 置き場所は対象コンポーネントと同階層の colocated `*.test.tsx`
- DOM 環境は jsdom、render / query は React Testing Library、操作は `user-event`、
  DOM assertion は `jest-dom` を使う
- 実行は `pnpm --filter oshikatsu-web test:component`。unit test と設定・収集・CI step を分ける
- Server Action は props へ注入できる場合、fake 関数または制御可能な Promise を渡す
- 直接 import が必要な外部 I/O と `next/*` 等のフレームワーク境界だけを最小限 mock する。
  React hook、reducer、対象コンポーネント内部 state は mock しない
- 子コンポーネントは原則実物を render し、ブラウザ専用 API など対象外の責務を持ち込む場合だけ
  境界を stub する
- 内部 state や CSS class ではなく、role、accessible name、入力状態、表示テキストなど、
  利用者から観測可能な振る舞いを assertion の対象にする
- 新規実装・既存コンポーネント変更時に対象条件を満たす範囲だけ追加し、既存全UIへ遡及しない

### Playwright E2E

- Next.js の実ページ統合、SSR / hydration、認証・認可、ルーティング、実 layout / focus / D&D、
  複数画面フローを対象にする
- `playwright/**/*.spec.ts` に置き、`pnpm --filter oshikatsu-web test:e2e` で実行する
- 純粋関数 test、component test、E2E のいずれでも、実行していない検証を通過したと報告しない

---

## 言語ポリシー

- PR 本文は日本語ベースで記載する
- PR に記載するコメント（対応サマリー、レビュー返信、再レビュー依頼を含む）は日本語ベースで記載する
- `docs/` 配下の資料は日本語ベースで記載する
