import { PendingLink } from "@/components/ui/PendingLink";
import { GroupBadge } from "@/components/ui/GroupBadge";
import type { ReleaseListItem } from "@/types/release";
import { formatReleaseTypeLabel } from "@/types/release";
import { formatDate } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

type ReleaseCardProps = {
  release: ReleaseListItem;
  showGroupName?: boolean;
};

export function ReleaseCard({ release, showGroupName = true }: ReleaseCardProps) {
  const typeLabel = formatReleaseTypeLabel(release.releaseType, release.numbering);

  return (
    <PendingLink
      href={`/releases/${release.id}`}
      className="block rounded-lg border border-foreground/10 bg-background p-4 transition-colors hover:bg-foreground/5"
      listBackFallbackHref={APP_ROUTES.releases}
    >
      <p className="text-sm font-medium text-foreground">{release.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {showGroupName && release.groupNameJa && (
          <GroupBadge
            groupName={release.groupNameJa}
            groupColor={release.groupColor}
          />
        )}
        <span className="text-xs text-foreground/50">{typeLabel}</span>
      </div>
      <p className="mt-1 text-xs text-foreground/50">収録曲: {release.trackCount}曲</p>
      {release.releaseDate && (
        <p className="mt-1 text-xs text-foreground/50">{formatDate(release.releaseDate)}</p>
      )}
    </PendingLink>
  );
}
