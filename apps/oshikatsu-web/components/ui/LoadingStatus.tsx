// Song/Livesなど、複数routeのloading skeletonで共有する「読み込み中」の可視status
// text（#486）。role="status" + aria-busy="true"を同一要素に持たせ、支援技術へ
// 読み込み中であることを伝える。周囲のfilter row/card placeholderはaria-hidden="true"
// にする前提で、この text 側だけが読み上げ対象になる（二重読み上げの回避）。
// role="status"はARIAの仕様上name-from-contentsではないため、可視textと同じ文言を
// aria-labelにも明示する（PendingLinkのpending spinnerと同じパターン、#482）。
// Server Componentからも使えるよう"use client"は付けない。
export function LoadingStatus() {
  return (
    <p
      role="status"
      aria-busy="true"
      aria-label="読み込み中"
      className="text-sm text-foreground-secondary"
    >
      読み込み中
    </p>
  );
}
