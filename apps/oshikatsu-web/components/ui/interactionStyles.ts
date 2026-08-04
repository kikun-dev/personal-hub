// Server Component が `"use client"` module から関数以外の値（class文字列）を
// importすると、その値がClient Reference proxyになり、runtimeのclass属性へ
// `Attempted to call ... from the server` というエラー文字列が混入する（#482）。
// interaction系のclass tokenは`"use client"`を付けないこのmoduleへ集約し、
// Server Componentからでも安全にimportできるようにする。

// shared form controls（Select / Input / Textarea / Combobox）が画面をまたいで
// 同一のfocus契約を持つための共有クラス。DESIGN.mdの「2px semantic focus ring」
// 「隣接色に対して3:1以上」「focusを未検証alphaから組み立てない」に従い、theme別
// semantic token（--focus-ring: light #1d4ed8 / dark #93c5fd）で2px outline + 2px
// offsetを描く。Button / PendingLink と同じ focus-visible パターンに揃える。
//
// foreground alpha由来のring（focus:ring-foreground/20 等）はこの契約では使わない。
export const focusRingClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

// #271: 画面遷移リンクの統一スタイル（非青）。foreground ベースで両テーマ対応。
// 太字＋控えめな下線、ホバーで下線が濃くなる。外部アンカーや button にも
// className として流用できるよう文字列で公開する。
export const textLinkClass =
  `font-medium text-foreground underline decoration-foreground-secondary underline-offset-2 transition-colors hover:decoration-foreground ${focusRingClass}`;

// フォーム内などの小さなテキストアクション（<button>）用。下線なし・ホバーで色が濃くなる。
export const textActionClass =
  `font-medium text-foreground-secondary transition-colors hover:text-foreground ${focusRingClass}`;

// standalone control の hit area 最小高（44px）。native form control など
// inline-flex を当てられない要素へは、この最小高だけを適用する。
export const standaloneTargetMinHeightClass = "min-h-11";

// back / disclosure / edit / summary action など standalone control 用。
// hit area は viewport ではなく操作種別で決めるため、Desktop でも縮めない。
export const standaloneTargetClass =
  `inline-flex ${standaloneTargetMinHeightClass} items-center`;

// 本文中の inline text link 用。44px block 化はせず、
// WCAG 2.2 Target Size Minimum の 24px を下限にする。
export const inlineTargetClass = "inline-flex min-h-6 items-center";
