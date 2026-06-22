import { Suspense } from "react";
import { SongFilters } from "@/components/songs/SongFilters";
import { SongGrid } from "@/components/songs/SongGrid";
import { SongSectionList } from "@/components/songs/SongSectionList";
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">楽曲</h1>
        <span className="text-sm text-foreground/50">{songs.length}曲</span>
      </div>
      <Suspense fallback={<div className="h-10" />}>
        <SongFilters groups={groups} />
      </Suspense>
      {isGroupFiltered ? (
        <SongGrid songs={songs} />
      ) : (
        <SongSectionList sections={songSections} />
      )}
    </div>
  );
}
