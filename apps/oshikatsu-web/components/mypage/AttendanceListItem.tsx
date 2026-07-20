import { AttendedTypeBadge } from "@/components/lives/AttendedTypeBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { PendingLink } from "@/components/ui/PendingLink";
import type { MyAttendanceEntry } from "@/types/attendance";
import { APP_ROUTES } from "@/lib/routes";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function formatAttendanceDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}(${WEEKDAY_LABELS[date.getDay()]})`;
}

type AttendanceListItemProps = {
  entry: MyAttendanceEntry;
  // マイページ / 集計は独立カード、トップページは grouped surface 内の行として描画する。
  variant?: "card" | "row";
  // 一覧を開いたページ（マイページ / 記録を見る）を戻り先にする。
  backHref?: string;
  // トップページ「最近の参加記録」（#344）用: 短い記録（note）を1行で添える。
  showNote?: boolean;
};

// 参戦記録の1行リスト表示（VenueDetailPage の公演一覧と同じトーン）。
// マイページ（#247）と参戦記録の集計（#248 /mypage/stats）の一覧で共通利用する。
export function AttendanceListItem({
  entry,
  variant = "card",
  backHref = APP_ROUTES.mypage,
  showNote = false,
}: AttendanceListItemProps) {
  return (
    <li
      data-ui="attendance-list-item"
      data-variant={variant}
      className={
        variant === "card"
          ? "rounded-lg border border-border-subtle p-3"
          : "py-2.5"
      }
    >
      <PendingLink
        href={`/lives/${entry.liveId}`}
        className="group grid grid-cols-[auto_minmax(0,4.75rem)_minmax(0,1fr)_auto] items-start gap-x-2 text-sm text-foreground min-[390px]:grid-cols-[auto_auto_minmax(0,1fr)_auto]"
        listBackFallbackHref={backHref}
      >
        <span
          data-ui="attendance-date"
          className="col-start-1 row-start-1 self-center whitespace-nowrap text-xs text-foreground-secondary"
        >
          {entry.performanceDate
            ? formatAttendanceDate(entry.performanceDate)
            : "日付未定"}
        </span>
        <span
          data-ui="attendance-type"
          className="col-start-2 row-start-1 flex min-w-0 self-center flex-col items-center gap-1"
        >
          {entry.groups.map((g) => (
            <span
              key={g.id}
              data-ui="attendance-group-badge"
              className="inline-flex max-w-full"
            >
              <GroupBadge groupName={g.nameJa} groupColor={g.color} />
            </span>
          ))}
          <span
            data-ui="attendance-attended-badge"
            className="inline-flex max-w-full"
          >
            <AttendedTypeBadge attendedType={entry.attendedType} />
          </span>
        </span>
        <span
          data-ui="attendance-content"
          className="col-start-3 row-start-1 min-w-0"
        >
          <span
            data-ui="attendance-title"
            className="block font-medium group-hover:underline"
          >
            {entry.liveName}
          </span>
          {entry.venueName && (
            <span
              data-ui="attendance-meta"
              className="mt-1 block text-xs text-foreground-secondary"
            >
              {entry.venueName}
            </span>
          )}
          {showNote && entry.note && (
            <span className="mt-1 block truncate text-xs text-foreground-secondary">
              {entry.note}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          data-ui="attendance-arrow"
          className="col-start-4 row-start-1 self-center text-foreground-secondary"
        >
          →
        </span>
      </PendingLink>
    </li>
  );
}
