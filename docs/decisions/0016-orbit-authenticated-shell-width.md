# ADR 0016: Sakalog authenticated shell の最大幅と wide surface の扱い

## Status

Accepted

## Context（背景）

Sakalog（oshikatsu-web）の authenticated shell（`app/(authenticated)/layout.tsx` の `main` と
`components/layout/Header.tsx` の内側コンテナ）は、コンテンツ最大幅を `max-w-5xl`(1024px) に
固定していた。この値は Orbit Phase 1（#29）で導入されて以降、それを正当化する Decision も
現行の情報密度での検証記録もないまま再評価されていなかった。

その後のデザイン監査（#399〜#403 等）で TOP の情報量が増え、`過去の今日`（`PastSameDay`
timeline）のイベント名列が実測で約190pxまで狭まり、長い名前が折り返して一覧性を損ねる状態が
顕在化した。名前列が細るのは shell の 1024px cap と TOP 内部の入れ子分割の二段構えによる。

参照端末は iPhone 17 / iPad Air 4 / PC。1280px cap の恩恵は主に PC だが、PC では広い画面を
情報密度へ活用したい。一方で shell 幅はグローバルに全画面へ効くため、prose 主体の Wiki 本文や
フォームは、そのまま全幅を使うと1行が長すぎて間延びする。cap をどこに置くか、wide 化した幅を
どの surface に使わせるかを、場当たりでなく方針として固定する必要があった。

検討した代替案:

- **5xl 据え置き + TOP 内部調整のみ**: TOP の折り返しは緩和できるが、PC の広い画面を活かせず
  cap 再評価の機会を逃す。
- **6xl(1152px)**: iPad landscape には十分だが、PC で使える幅と TOP の情報密度を活かし切れない。
- **全ページを無条件に 1280px の読み幅で表示**: 一覧・詳細・カレンダー等の data surface には
  好適だが、prose とフォームが間延びする。

## Decision（決定）

### 1. authenticated shell の最大幅を 1280px（`max-w-7xl`）にする

`app/(authenticated)/layout.tsx` の `main` と `components/layout/Header.tsx` の内側コンテナを
`max-w-5xl` から `max-w-7xl`(1280px) へ変更し、Header と本文の左右端を揃えたまま拡張する。
`px-4` を含むため cap 到達時の実コンテンツ幅は 1248px。`lg=1024px` の responsive breakpoint は
変更しない（1280px は container cap であり breakpoint ではない）。

### 2. TOP の `過去の今日` : `最近の参加記録` は比率（1.5fr : 1fr）を維持する

当初は `最近の参加記録` を固定幅にして増分を `過去の今日` へ寄せる案も検討したが、TOP 内で
片方だけ幅が変わる違和感を避けるため、比率 `1.5fr : 1fr` を維持し、shell 拡張時は両カラムが
均等（比例）に広がる形にする。イベント名列は shell 拡張ぶんだけ比例して広がり、折り返しが減る。

### 3. wide data surface は shell 全幅を利用してよい

一覧・3列 grid・詳細・カレンダー等の data surface は 1280px 全幅を利用してよい。特に
`PerformanceCarousel`（公演カルーセル）のような、複数カード同時可視を前提に設計された surface は
幅の拡張を活かす。

### 4. prose・フォーム等は page 側で読み幅を制限してよい

prose 主体の surface は shell 全幅を使わせず、page 側で読み幅を制限してよい。今回は Wiki 詳細
（`app/(authenticated)/wiki/[slug]/page.tsx`）の記事カラムを `max-w-3xl` へ制限する。フォーム
（Event / Spot / attendance 等）の間延びは wide regression として認識するが、幅の最適化は後続の
デザインブラッシュアップで page 単位に扱う（本 ADR ではフォーム幅は変更しない）。

### 5. carousel の末尾境界を「末尾カード完全可視」で判定する

shell を 1280px に広げると、1440px 相当の viewport で `PerformanceCarousel` の実幅が広がり、
末尾カードが60%可視の時点で `atEnd`（次ボタン無効化）に達する一方、カード内の操作要素は
「完全に viewport 内」になるまで roving で `tabindex=-1` のまま残るため、キーボードで末尾公演の
操作へ到達できない a11y 回帰が生じる。これを避けるため、`atEnd` の判定に「末尾カードが完全に
viewport 内」条件（`lastCardFullyVisible`）を加え、末尾カードが完全可視になるまで next/ArrowRight
を有効に保つ。可視カウント（`firstVisible`/`lastVisible`、60%閾値）や snap/roving モデル自体は
変更しない。

## Consequences（結果・影響）

### 良い点

- PC の広い画面で左右余白が過剰にならず、TOP のイベント名折り返しが shell 拡張ぶん緩和される。
- data surface（一覧・詳細・カルーセル）が広い幅を情報密度へ活用できる。
- prose の読み幅を page 側で制御でき、Wiki 本文の間延びを防げる。
- carousel の wide viewport 対応が末尾境界まで通り、末尾公演へキーボード到達できる。
- shell 幅がグローバル方針として明文化され、以後「なぜこの幅か」で迷わない。

### 悪い点

- shell 変更はグローバルに全画面へ効くため、まだデザインが固まっていない画面も一律で横に広がり、
  page 単位の wide regression 対応（フォーム間延び等）が後続タスクとして残る。
- prose とフォームで「全幅を使わない」例外が生まれ、幅の扱いが surface 種別で分岐する
  （data surface = 全幅可 / prose・form = page 側で制限）。
- carousel の `atEnd` 判定に条件が1つ増え、境界セマンティクスがわずかに複雑になる。

## Notes

- 発端 Issue: #411
- 関連 ADR: 0005（Orbit Phase 1 設計）、0011（Wiki の Markdown レンダリング）、
  0013（Sakalog 主要ジャーニーの Daily Story）
- 変更ファイル: `app/(authenticated)/layout.tsx`、`components/layout/Header.tsx`、
  `app/(authenticated)/page.tsx`（コメントのみ）、`components/lives/PerformanceCarousel.tsx`、
  `app/(authenticated)/wiki/[slug]/page.tsx`、`playwright/app-shell-width.spec.ts`（回帰契約）
- 回帰契約: 1440px で Header/main が 1280px かつ左右端一致・root overflow なし
  （`playwright/app-shell-width.spec.ts`）
- フォロー: フォーム等 残る wide surface の幅最適化は後続のデザインブラッシュアップで page 単位に
  行う。`apps/oshikatsu-web/DESIGN.md` / `.impeccable/design.json` の最大幅記述も 1280px へ更新する。
