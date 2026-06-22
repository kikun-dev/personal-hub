import { SongCard } from "@/components/songs/SongCard";
import type { SongListItem } from "@/types/song";

type SongGridProps = {
  songs: SongListItem[];
};

export function SongGrid({ songs }: SongGridProps) {
  if (songs.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/50">
        楽曲が見つかりません
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {songs.map((song) => (
        <SongCard key={song.id} song={song} />
      ))}
    </div>
  );
}
