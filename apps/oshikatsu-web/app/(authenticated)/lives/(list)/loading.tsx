import { LivesLoadingSkeleton } from "@/components/lives/LivesLoadingSkeleton";

// LivesPageはh1描画前にgetLivesPageDataをawaitするため、初回server fetch中は
// Suspenseではカバーできないroute全体の空白が生じる（#486 Evidence）。この
// loading.tsxはNext.jsのfile-based fallbackとして、その空白の間だけ表示される。
//
// route group `(list)` により一覧ルートだけに適用範囲を限定している。
// loading.tsxはNext.js App Routerの仕様上、配下の全ネストルート（lives/[id]や
// setlist等）にも波及するため、一覧専用のこの内容（h1「ライブ」込み）が
// 詳細ルートへ波及しないよう、URLに影響しないroute groupで隔離している。
export default function Loading() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">ライブ</h1>
      <LivesLoadingSkeleton />
    </div>
  );
}
