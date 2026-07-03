import { AttendedTypeBadge } from "@/components/lives/AttendedTypeBadge";
import { PendingLink } from "@/components/ui/PendingLink";
import type { MyAttendanceEntry } from "@/types/attendance";
import { formatDate } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

type AttendanceListItemProps = {
  entry: MyAttendanceEntry;
  // 一覧を開いたページ（マイページ / 記録を見る）を戻り先にする。
  backHref?: string;
};

// 参戦記録の1行リスト表示（VenueDetailPage の公演一覧と同じトーン）。
// マイページ（#247）と参戦記録の集計（#248 /mypage/stats）の一覧で共通利用する。
export function AttendanceListItem({
  entry,
  backHref = APP_ROUTES.mypage,
}: AttendanceListItemProps) {
  return (
    <li className="rounded-lg border border-foreground/10 p-3">
      <PendingLink
        href={`/lives/${entry.liveId}`}
        className="flex flex-wrap items-center gap-2 text-sm text-foreground hover:underline"
        listBackFallbackHref={backHref}
      >
        <span className="text-xs text-foreground/50">
          {entry.performanceDate ? formatDate(entry.performanceDate) : "日付未定"}
        </span>
        <span>{entry.liveName}</span>
        {entry.venueName && (
          <span className="text-xs text-foreground/60">{entry.venueName}</span>
        )}
        <AttendedTypeBadge attendedType={entry.attendedType} />
      </PendingLink>
    </li>
  );
}
