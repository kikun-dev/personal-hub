import { Suspense } from "react";
import { SongBrowser } from "@/components/songs/SongBrowser";
import { getSongsPageData } from "@/usecases/readOrbitMusicData";

export default async function SongsPage() {
  // 絞り込みはクライアント側で行うため、常に全件取得する
  const { songs, groups, songSections } = await getSongsPageData({});

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">楽曲</h1>
      <Suspense fallback={<div className="h-10" />}>
        <SongBrowser groups={groups} songs={songs} songSections={songSections} />
      </Suspense>
    </div>
  );
}
