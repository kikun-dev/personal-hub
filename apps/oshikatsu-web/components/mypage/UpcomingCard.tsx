import { AttendedTypeBadge } from "@/components/lives/AttendedTypeBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { PendingLink } from "@/components/ui/PendingLink";
import type { MyAttendanceEntry } from "@/types/attendance";
import { LIVE_TYPE_LABELS } from "@/types/live";
import { formatDate, formatTime } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

type UpcomingCardProps = {
  entry: MyAttendanceEntry;
};

// 次のライブ: カードで表示（ライブ一覧の LiveCard と同じトーン）
export function UpcomingCard({ entry }: UpcomingCardProps) {
  return (
    <PendingLink
      href={`/lives/${entry.liveId}`}
      className="block rounded-lg border border-foreground/10 bg-background p-4 transition-colors hover:bg-foreground/5"
      listBackFallbackHref={APP_ROUTES.mypage}
    >
      <p className="text-xs text-foreground/50">
        {entry.performanceDate ? formatDate(entry.performanceDate) : "日付未定"}
        {entry.startsAt ? ` ${formatTime(entry.startsAt)}〜` : ""}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{entry.liveName}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-xs text-foreground/50">
          {LIVE_TYPE_LABELS[entry.liveType]}
        </span>
        {entry.venueName && (
          <span className="text-xs text-foreground/60">{entry.venueName}</span>
        )}
        {entry.groups.map((g) => (
          <GroupBadge key={g.id} groupName={g.nameJa} groupColor={g.color} />
        ))}
      </div>
      <div className="mt-2">
        <AttendedTypeBadge attendedType={entry.attendedType} />
      </div>
    </PendingLink>
  );
}
