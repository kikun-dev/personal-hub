import { Suspense } from "react";
import { LiveBrowser } from "@/components/lives/LiveBrowser";
import { LivesLoadingSkeleton } from "@/components/lives/LivesLoadingSkeleton";
import { getLivesPageData } from "@/usecases/readOrbitLiveData";

export default async function LivesPage() {
  const { lives, groups } = await getLivesPageData();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">ライブ</h1>
      {/* loading.tsxはserver fetch中のroute全体（h1込み）を覆うが、この
          Suspenseはfetch完了後、LiveBrowser（client component）がhydrate
          し終わるまでの短い間だけを覆う。h1は上で描画済みのため、fallback
          側には含めない（#486）。 */}
      <Suspense fallback={<LivesLoadingSkeleton />}>
        <LiveBrowser groups={groups} lives={lives} />
      </Suspense>
    </div>
  );
}
