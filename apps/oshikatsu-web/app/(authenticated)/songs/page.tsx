import { Suspense } from "react";
import { SongFilters } from "@/components/songs/SongFilters";
import { SongCard } from "@/components/songs/SongCard";
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

  const { songs, groups } = await getSongsPageData(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">楽曲</h1>
        <span className="text-sm text-foreground/50">{songs.length}曲</span>
      </div>
      <Suspense fallback={<div className="h-10" />}>
        <SongFilters groups={groups} />
      </Suspense>
      {songs.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/50">
          楽曲が見つかりません
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </div>
  );
}
