# ADR 0004: チャートライブラリ（recharts）採用

## Status
Accepted

## Context（背景）

household-web のダッシュボードに以下のチャートを導入する:

- **カテゴリ別円グラフ**（通常モード）
- **二重ドーナツチャート**（推し活モード: 内側=グループ、外側=活動タイプ）

React 19 + Next.js 16（App Router）環境で動作するライブラリが必要。

---

## Decision（決定）

**recharts** を採用する。

- `PieChart` + 複数 `Pie` で二重ドーナツを自然に表現可能
- React コンポーネントベースの API で既存コードと統一感がある
- TypeScript 対応
- SSR 非対応だが `"use client"` で問題なし

---

## Alternatives Considered（検討した代替案）

### Chart.js + react-chartjs-2
- 高機能だが imperative 寄りの API
- React ラッパーが必要で間接層が増える
- → 採用しない

### Custom SVG
- 依存ゼロだがドーナツチャートの実装工数が大きい
- Tooltip やレスポンシブ対応を自前で実装する必要がある
- → 採用しない

### Nivo
- 高品質なチャートだがスタイリングの自由度が低い
- Tailwind テーマとの統合がしにくい
- → 採用しない

---

## Consequences（結果・影響）

### 良い点
- 宣言的な React コンポーネント API
- 二重ドーナツが `<Pie>` 2 つで実現可能
- tree-shakeable でバンドルへの影響を最小化

### 悪い点
- バンドルサイズ増加（約 200KB、tree-shaking 後はそれ以下）
- SSR 非対応（`"use client"` 必須）

---

## Review Trigger（見直し条件）

- recharts が React 19 との互換性問題を起こした場合
- 折れ線グラフ等の高度なチャートが大量に必要になり、別ライブラリが適切になった場合
