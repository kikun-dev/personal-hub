// Song/Livesなど、複数routeのloading skeletonで共有する「読み込み中」の可視status
// text（#486）。role="status"を持たせ、支援技術へ読み込み中であることを伝える。
// aria-busy="true"はこの要素自身には**付けない**（PR #487 P1）。aria-busyは
// 「true の間、支援技術は配下の変更を無視し、false になった時点で処理する」ための
// 状態で、この要素は読み込み完了時にcomponentごとunmountされるため、もし自身に
// 付けるとaria-busyが一度もfalseにならないまま終わり、「読み込み中」の通知自体が
// 抑止されうる。aria-busy="true"は代わりに、読み込み対象のcollection領域
// （このcomponentの外側）に付ける（SongsLoadingSkeleton/LivesLoadingSkeleton参照）。
// 周囲のfilter row/card placeholderはaria-hidden="true"にする前提で、この text 側
// だけが読み上げ対象になる（二重読み上げの回避）。
// role="status"はARIAの仕様上name-from-contentsではないため、可視textと同じ文言を
// aria-labelにも明示する（PendingLinkのpending spinnerと同じパターン、#482）。
// Server Componentからも使えるよう"use client"は付けない。
export function LoadingStatus() {
  return (
    <p role="status" aria-label="読み込み中" className="text-sm text-foreground-secondary">
      読み込み中
    </p>
  );
}
