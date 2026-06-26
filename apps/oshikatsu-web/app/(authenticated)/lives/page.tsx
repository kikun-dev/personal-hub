import { Suspense } from "react";
import { LiveBrowser } from "@/components/lives/LiveBrowser";
import { getLivesPageData } from "@/usecases/readOrbitData";

export default async function LivesPage() {
  const { lives, groups } = await getLivesPageData();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">ライブ</h1>
      <Suspense fallback={<div className="h-10" />}>
        <LiveBrowser groups={groups} lives={lives} />
      </Suspense>
    </div>
  );
}
