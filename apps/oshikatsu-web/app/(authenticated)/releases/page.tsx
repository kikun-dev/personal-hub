import { Suspense } from "react";
import { ReleaseBrowser } from "@/components/releases/ReleaseBrowser";
import { getReleasesPageData } from "@/usecases/readOrbitMusicData";

export default async function ReleasesPage() {
  // 絞り込みはクライアント側で行うため、常に全件取得する
  const { releases, groups } = await getReleasesPageData({});

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">リリース</h1>
      <Suspense fallback={<div className="h-10" />}>
        <ReleaseBrowser groups={groups} releases={releases} />
      </Suspense>
    </div>
  );
}
