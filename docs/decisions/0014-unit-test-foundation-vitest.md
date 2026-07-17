# ADR 0014: テスト基盤としての Vitest 導入と純関数のみのテスト対象範囲

## Status
Accepted

## Context（背景）

これまでリファクタリングの安全性は typecheck / lint と、その場限りの機械的な前後比較
（属性集合の diff、タグ集合の比較スクリプト等）で担保してきた（#303〜#306）。
この方式は有効だが使い捨てであり、`getAttendanceStats`（集計）や `validateSpot`（バリデーション）、
`markdownHeadings`（見出し ID 導出）のような純関数のロジック退行を継続的には検知できない。

機能が揃い「使いながら育てる」フェーズに入ったため、退行検知の仕組みを持つ方向へ転換する
（運用リスク棚卸し 2026-07-07、`docs/orbit-roadmap.md` Phase 4）。

ランナーは Vitest と Jest を比較した。Jest は実績が豊富だが ESM / TypeScript の設定と
Next.js との噛み合わせ調整が増える。Vitest は ESM / TS がそのまま動き高速で、
本リポジトリに再利用すべき既存 Jest 資産は無い。また Sakalog の PR #372（#361）で
Vitest による決定的な state matrix 検証の先行実績を得た。

対象範囲は「純関数のみ（R1）」と「コンポーネントテストまで（R2）」を比較した。
R2 は jsdom / Testing Library の追加依存と設定を伴い、UI の検証は既存の Playwright 基盤が
実ページに対して担えているため、現時点では導入根拠が弱い。

## Decision（決定）

### 1. ランナー

Vitest を採用する。導入対象は `apps/oshikatsu-web` と `apps/household-web` の両アプリとし、
`packages/supabase` はテスト対象の純関数が生まれた時点で追加する。

### 2. テスト対象範囲

`usecases/` / `lib/` の純関数のみを対象とする（R1）。
UI コンポーネント・repository は対象外とし、E2E / DOM 構造の検証は Playwright で別管理する。
コンポーネントテスト（jsdom / Testing Library）は需要が明確になった時点で別 Issue として再検討する。

### 3. 配置・実行・運用

- テストは実装ファイルと同階層の colocated `*.test.ts` に置く
- 実行は `pnpm --filter <app> test:unit`（既存 Playwright・将来の `test:e2e` と区別する命名）
- CI（`ci-oshikatsu-web.yml` / `ci-household-web.yml`）で Unit Test step として必ず実行する
- 新規実装・既存関数の変更時にテストを足す運用とし、既存全コードへの遡及テストはしない
- テスト対象の純関数は `next/*` や `server-only` 等の server 専用 import を
  import チェーンに巻き込まない構成を維持する

詳細な規約は `rules/implementation.md` の「テスト」節を正とする。

## Consequences（結果・影響）

### 良い点

- 純関数のロジック退行を CI で継続的に検知でき、リファクタリング時に
  「テストが通る」ことを振る舞い不変の担保として使える
- 追加依存が vitest 1 つに閉じ、Next.js のビルド構成に影響しない
- Playwright（実ページの構造・interaction）と Vitest（決定的な state matrix）の
  役割分担が明確になる

### 悪い点

- UI コンポーネント単体の退行（例: shared primitive の属性合成）は本基盤では拾えず、
  Playwright の実ページ検証か手動確認で補う必要がある
- colocated テストはソースツリーにテストファイルが混ざるため、ファイル数が増える
- 「新規・変更時に足す」運用のため、触られていない既存純関数は当面テストされないまま残る

## Notes

- 導入 Issue: #323（Options / Trade-offs の一次情報）
- 先行導入: PR #372（#361 の calendar semantic DTO 検証で oshikatsu-web に先行導入し、本 ADR で正式化）
- 関連: `rules/implementation.md`「テスト」節、`docs/orbit-roadmap.md` Phase 4
