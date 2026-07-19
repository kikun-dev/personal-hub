// shared form controls（Select / Input / Textarea / Combobox）が画面をまたいで
// 同一のfocus契約を持つための共有クラス。DESIGN.mdの「2px semantic focus ring」
// 「隣接色に対して3:1以上」「focusを未検証alphaから組み立てない」に従い、theme別
// semantic token（--focus-ring: light #1d4ed8 / dark #93c5fd）で2px outline + 2px
// offsetを描く。Button / PendingLink と同じ focus-visible パターンに揃える。
//
// foreground alpha由来のring（focus:ring-foreground/20 等）はこの契約では使わない。
export const focusRingClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";
