import { PendingLink } from "@/components/ui/PendingLink";
import { GroupBadge } from "@/components/ui/GroupBadge";
import type { LiveListItem } from "@/types/live";
import { LIVE_TYPE_LABELS } from "@/types/live";
import { formatDate } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

type LiveCardProps = {
  live: LiveListItem;
};

function formatDateRange(
  firstDate: string | null,
  lastDate: string | null
): string {
  if (!firstDate) return "日程未定";
  if (!lastDate || firstDate === lastDate) return formatDate(firstDate);
  return `${formatDate(firstDate)} 〜 ${formatDate(lastDate)}`;
}

export function LiveCard({ live }: LiveCardProps) {
  return (
    <PendingLink
      href={`/lives/${live.id}`}
      className="block rounded-lg border border-foreground/10 bg-background p-4 transition-colors hover:bg-foreground/5"
      data-ui="live-card"
      listBackFallbackHref={APP_ROUTES.lives}
    >
      <p className="text-sm font-medium text-foreground">{live.name}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {live.performerGroups.map((group) => (
          <GroupBadge
            key={group.groupId}
            groupName={group.groupNameJa}
            groupColor={group.groupColor}
          />
        ))}
        <span className="text-xs text-foreground-secondary" data-ui="live-type">
          {LIVE_TYPE_LABELS[live.liveType]}
        </span>
      </div>
      <p className="mt-1 text-xs text-foreground-secondary" data-ui="live-date">
        {formatDateRange(live.firstDate, live.lastDate)}
        {live.performanceCount > 0 ? `（${live.performanceCount}公演）` : ""}
      </p>
    </PendingLink>
  );
}
