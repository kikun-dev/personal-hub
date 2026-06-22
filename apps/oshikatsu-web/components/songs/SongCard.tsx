import { PendingLink } from "@/components/ui/PendingLink";
import type { SongListItem } from "@/types/song";
import { formatDate } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

type SongCardProps = {
  showGroupName?: boolean;
  song: SongListItem;
};

export function SongCard({ showGroupName = true, song }: SongCardProps) {
  return (
    <PendingLink
      href={`/songs/${song.id}`}
      className="block rounded-lg border border-foreground/10 bg-background p-4 transition-colors hover:bg-foreground/5"
      listBackFallbackHref={APP_ROUTES.songs}
    >
      <p className="text-sm font-medium text-foreground">{song.title}</p>
      {showGroupName && song.groupNameJa && (
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
    </PendingLink>
  );
}
