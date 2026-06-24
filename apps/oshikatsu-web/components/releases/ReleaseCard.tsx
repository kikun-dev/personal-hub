import { PendingLink } from "@/components/ui/PendingLink";
import type { ReleaseListItem } from "@/types/release";
import { RELEASE_TYPE_LABELS } from "@/types/release";
import { formatDate } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

type ReleaseCardProps = {
  release: ReleaseListItem;
  showGroupName?: boolean;
};

export function ReleaseCard({ release, showGroupName = true }: ReleaseCardProps) {
  const metaParts = [
    ...(showGroupName && release.groupNameJa ? [release.groupNameJa] : []),
    RELEASE_TYPE_LABELS[release.releaseType],
    ...(release.numbering ? [String(release.numbering)] : []),
  ];

  return (
    <PendingLink
      href={`/releases/${release.id}`}
      className="block rounded-lg border border-foreground/10 bg-background p-4 transition-colors hover:bg-foreground/5"
      listBackFallbackHref={APP_ROUTES.releases}
    >
      <p className="text-sm font-medium text-foreground">{release.title}</p>
      <p className="mt-1 text-xs text-foreground/50">{metaParts.join(" / ")}</p>
      <p className="mt-1 text-xs text-foreground/50">曲目: {release.trackCount}曲</p>
      {release.releaseDate && (
        <p className="mt-1 text-xs text-foreground/50">{formatDate(release.releaseDate)}</p>
      )}
    </PendingLink>
  );
}
