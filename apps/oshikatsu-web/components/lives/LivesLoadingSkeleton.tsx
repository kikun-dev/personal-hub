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
      <LivesFilterRowSkeleton />
      <LoadingStatus />
      {/* 実gridはgap-3 sm:grid-cols-2 lg:grid-cols-3。sm(2列)/lg(3列)双方で
          最低1行を満たせる最小公倍数として6件を表示する。 */}
      <CollectionCardGridSkeleton count={6} />
    </div>
  );
}
