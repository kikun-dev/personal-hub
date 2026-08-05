import { Suspense } from "react";
import { SongBrowser } from "@/components/songs/SongBrowser";
import { SongsLoadingSkeleton } from "@/components/songs/SongsLoadingSkeleton";
import { getSongsPageData } from "@/usecases/readOrbitMusicData";

export default async function SongsPage() {
  // 絞り込みはクライアント側で行うため、常に全件取得する
  const { songs, groups, songSections } = await getSongsPageData({});

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">楽曲</h1>
      {/* loading.tsxはserver fetch中のroute全体（h1込み）を覆うが、この
          Suspenseはfetch完了後、SongBrowser（client component）がhydrate
          し終わるまでの短い間だけを覆う。h1は上で描画済みのため、fallback
          側には含めない（#486）。 */}
      <Suspense fallback={<SongsLoadingSkeleton />}>
        <SongBrowser groups={groups} songs={songs} songSections={songSections} />
      </Suspense>
    </div>
  );
}
