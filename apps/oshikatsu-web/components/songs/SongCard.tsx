import Link from "next/link";
import type { SongListItem } from "@/types/song";
import { formatDate } from "@/lib/formatters";

type SongCardProps = {
  song: SongListItem;
};

export function SongCard({ song }: SongCardProps) {
  return (
    <Link
      href={`/songs/${song.id}`}
      className="block rounded-lg border border-foreground/10 bg-background p-4 transition-colors hover:bg-foreground/5"
    >
      <p className="text-sm font-medium text-foreground">{song.title}</p>
      {song.groupNameJa && (
        <p className="mt-1 text-xs text-foreground/50">
          {song.groupNameJa}
        </p>
      )}
      <p className="mt-1 text-xs text-foreground/50">
        紐づけリリース: {song.releaseCount}件
      </p>
      {song.firstReleaseDate && (
        <p className="mt-1 text-xs text-foreground/50">
          初回リリース: {formatDate(song.firstReleaseDate)}
        </p>
      )}
    </Link>
  );
}
