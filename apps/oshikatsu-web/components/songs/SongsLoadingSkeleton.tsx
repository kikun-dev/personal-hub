import { CollectionCardGridSkeleton } from "@/components/ui/CollectionCardGridSkeleton";
import { LoadingStatus } from "@/components/ui/LoadingStatus";

// 実filter row（SongBrowser）はgroup/label/generation(条件付き)/search/checkbox/
// countの最大6要素で構成される。generation選択欄はgroup選択時のみ出現する条件付き
// 要素のため、placeholder側はその1つを省いた最大常時表示構成（group/label/search
// 入力 + count）の4boxで並びの雰囲気を示す（実要素と1:1対応させる過剰な精度は狙わない）。
function SongsFilterRowSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3" aria-hidden="true">
      <div className="h-8 w-32 rounded-lg border border-border-strong bg-surface-subtle" />
      <div className="h-8 w-28 rounded-lg border border-border-strong bg-surface-subtle" />
      <div className="h-8 w-full max-w-xs flex-1 rounded-lg border border-border-strong bg-surface-subtle" />
      <div className="ml-auto h-4 w-12 shrink-0 rounded bg-surface-subtle" />
    </div>
  );
}

// app/(authenticated)/songs/loading.tsx（route全体、h1込み）と
// app/(authenticated)/songs/page.tsxのSuspense fallback（h1描画後、
// SongBrowserのhydration待ちの間だけ）の両方から使う共有body。
// h1は呼び出し側がそれぞれ別に持つため、ここには含めない（#486）。
export function SongsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <SongsFilterRowSkeleton />
      <LoadingStatus />
      {/* 実gridはgap-3 sm:grid-cols-2 lg:grid-cols-3。sm(2列)/lg(3列)双方で
          最低1行を満たせる最小公倍数として6件を表示する。 */}
      <CollectionCardGridSkeleton count={6} />
    </div>
  );
}
