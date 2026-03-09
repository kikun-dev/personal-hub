import Link from "next/link";
import type { Song } from "@/types/song";
import { formatDate } from "@/lib/formatters";

type SongCardProps = {
  song: Song;
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
        紐づけリリース: {song.releases.length}件
      </p>
      {song.releaseDate && (
        <p className="mt-1 text-xs text-foreground/50">
          初回リリース: {formatDate(song.releaseDate)}
        </p>
      )}
    </Link>
  );
}
