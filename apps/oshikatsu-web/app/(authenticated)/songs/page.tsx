import { Suspense } from "react";
import { SongBrowser } from "@/components/songs/SongBrowser";
import { SongFilters } from "@/components/songs/SongFilters";
import type { SongFilters as SongFiltersType } from "@/types/song";
import { getSongsPageData } from "@/usecases/readOrbitData";

type SongsPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function SongsPage({ searchParams }: SongsPageProps) {
  const params = await searchParams;

  const filters: SongFiltersType = {
    groupId: params.groupId,
  };

  const { songs, groups, songSections } = await getSongsPageData(filters);
  const isGroupFiltered = Boolean(filters.groupId);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">楽曲</h1>
      <Suspense fallback={<div className="h-10" />}>
        <SongFilters groups={groups} />
      </Suspense>
      <SongBrowser
        isGroupFiltered={isGroupFiltered}
        songs={songs}
        songSections={songSections}
      />
    </div>
  );
}
