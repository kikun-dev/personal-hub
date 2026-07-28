# ADR 0014: テスト基盤としての Vitest 導入とテスト対象範囲

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

## 追記（2026-07-28 / #442）: 操作密度の高い Client Component を対象へ追加

### 再評価の背景

#424 / PR #437 の `SetlistEditor` では、非同期のオリメン反映、手動編集によるキャンセル、
保存との相互排他、disabled、結果通知を組み合わせた。状態遷移は純粋 reducer としてテストしたが、
各 UI handler がキャンセル event を dispatch することや、両方向の相互排他を正しく配線することは
純粋関数テストでは検証できなかった。実際に、手動編集 handler の dispatch 漏れと片方向だけの
相互排他がレビューで見つかり、需要が明確になった時点で再検討するという本 ADR の条件を満たした。

案A「純粋関数 + Playwright の現状維持」、案B「Testing Library + DOM環境」、案C
「ブラウザベースの component test」を、配線ミスの検出力、実行速度、flaky、ブラウザ忠実度、
mock・CIコスト、accessibility assertionで比較した。

### Decision

案Bを採用し、`apps/oshikatsu-web` に限って次の component test 基盤を追加する。

- runner は既存の Vitest、DOM 環境は jsdom
- render / query は React Testing Library、操作は `user-event`、DOM assertion は `jest-dom`
- 対象コンポーネントと同階層の colocated `*.test.tsx` に置く
- `test:unit` とは設定・収集対象・実行コマンド・CI step を分離し、`test:component` で実行する
- 対象は、複数操作と state の連動、非同期 lifecycle、disabled・通知・入力保持など、
  純粋関数だけでは配線を保証できない Client Component に限定する
- Server Action は props へ注入する fake を優先し、`next/*` 等のフレームワーク境界だけを
  必要最小限 mock する。React hook、reducer、内部 state は mock しない
- assertion は role、accessible name、入力状態、表示テキストなど利用者から観測可能な契約に置く

CSS layout、D&D 座標、実ブラウザ focus、navigation、SSR / hydration、認証・認可、RLS、
複数画面フローは対象外とし、既存 Playwright に残す。jsdom が実装しない挙動を mock で再現しない。
Server Component、repository、Server Action 本体も DOM test の対象外とする。

案Cは実ブラウザ忠実度に優れるが、今回必要な React の event・state 配線には案Bで十分な検出力が
あり、ブラウザ起動・provider・CI環境と native ESM mock の追加コストを正当化しないため採用しない。

この追記は、Decision §2 の「純関数のみ」と、Consequences の
「UIコンポーネント単体の退行は本基盤では拾えない」を上記の限定範囲で更新する。

### Consequences

- jsdom / Testing Library 関連の devDependencies と component test 用設定が増える
- component test は実ブラウザの代替ではなく、純粋関数 test と Playwright の間の配線検証を担う
- 対象条件を満たす新規・変更時だけ追加し、既存全コンポーネントへ遡及しない
- 詳細な配置、mock、3層の責務分担は `rules/implementation.md` の「テスト」節を正とする
- 基盤導入と代表テストは #450 で実装する

## Notes

- 導入 Issue: #323（Options / Trade-offs の一次情報）
- 先行導入: PR #372（#361 の calendar semantic DTO 検証で oshikatsu-web に先行導入し、本 ADR で正式化）
- 関連: `rules/implementation.md`「テスト」節、`docs/orbit-roadmap.md` Phase 4
- component test 再評価: #442、実装: #450
