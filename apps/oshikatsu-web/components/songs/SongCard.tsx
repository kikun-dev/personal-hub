import { PendingLink } from "@/components/ui/PendingLink";
import { Badge } from "@/components/ui/Badge";
import type { SongListItem } from "@/types/song";
import { SONG_LABEL_BADGE_COLOR, formatSongLabel } from "@/types/song";
import { formatReleaseTypeLabel } from "@/types/release";
import { formatDate } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

type SongCardProps = {
  showGroupName?: boolean;
  song: SongListItem;
};

export function SongCard({ showGroupName = true, song }: SongCardProps) {
  const labelText = formatSongLabel(song.label, song.generation, song.groupNameJa);
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
      {(song.representativeReleaseType || labelText) && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {song.representativeReleaseType && (
            <span className="text-xs text-foreground/50">
              {formatReleaseTypeLabel(
                song.representativeReleaseType,
                song.representativeNumbering
              )}
            </span>
          )}
          {labelText && <Badge label={labelText} color={SONG_LABEL_BADGE_COLOR} />}
        </div>
      )}
      {song.firstReleaseDate && (
        <p className="mt-1 text-xs text-foreground/50">
          初回リリース: {formatDate(song.firstReleaseDate)}
        </p>
      )}
    </PendingLink>
  );
}
