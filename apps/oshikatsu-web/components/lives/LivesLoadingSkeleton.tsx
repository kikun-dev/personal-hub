import { CollectionCardGridSkeleton } from "@/components/ui/CollectionCardGridSkeleton";
import { LoadingStatus } from "@/components/ui/LoadingStatus";

// 実filter row（LiveBrowser）は出演グループselect + countのみで、Songのfilter row
// より要素数がずっと少ない。共有skeleton componentへfilter数を吸収する汎用propsは
// 持たせず（Issue #486 Non-goal）、route固有の並びとしてここに個別実装する。
function LivesFilterRowSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3" aria-hidden="true">
      <div className="h-8 w-32 rounded-lg border border-border-strong bg-surface-subtle" />
      <div className="ml-auto h-4 w-12 shrink-0 rounded bg-surface-subtle" />
    </div>
  );
}

// app/(authenticated)/lives/loading.tsx（route全体、h1込み）と
// app/(authenticated)/lives/page.tsxのSuspense fallback（h1描画後、
// LiveBrowserのhydration待ちの間だけ）の両方から使う共有body。
// h1は呼び出し側がそれぞれ別に持つため、ここには含めない（#486）。
export function LivesLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* LoadingStatus（role="status"）はaria-busy="true"のsubtreeの外に置く。
          aria-busy="true"はこのcomponentがcollection本体の読み込み完了時に丸ごと
          unmountされる下のdivへ付け、statusと分離する（PR #487 P1）。同一要素に
          両方持たせると、aria-busyがfalseになる前にunmountされ「読み込み中」の
          通知自体が抑止されうる。この分離に伴い、元はfilter rowとcard gridの間
          にあったLoadingStatusを先頭へ移した（視覚順としても自然）。 */}
      <LoadingStatus />
      <div className="space-y-4" aria-busy="true">
        <LivesFilterRowSkeleton />
        {/* 実gridはgap-3 sm:grid-cols-2 lg:grid-cols-3。sm(2列)/lg(3列)双方で
            最低1行を満たせる最小公倍数として6件を表示する。 */}
        <CollectionCardGridSkeleton count={6} />
      </div>
    </div>
  );
}
