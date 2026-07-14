import { AttendedTypeBadge } from "@/components/lives/AttendedTypeBadge";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { PendingLink } from "@/components/ui/PendingLink";
import type { MyAttendanceEntry } from "@/types/attendance";
import { formatDate } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

type AttendanceListItemProps = {
  entry: MyAttendanceEntry;
  // 一覧を開いたページ（マイページ / 記録を見る）を戻り先にする。
  backHref?: string;
  // トップページ「最近の参加記録」（#344）用: 短い記録（note）を1行で添える。
  showNote?: boolean;
};

// 参戦記録の1行リスト表示（VenueDetailPage の公演一覧と同じトーン）。
// マイページ（#247）と参戦記録の集計（#248 /mypage/stats）の一覧で共通利用する。
export function AttendanceListItem({
  entry,
  backHref = APP_ROUTES.mypage,
  showNote = false,
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
        {entry.groups.map((g) => (
          <GroupBadge key={g.id} groupName={g.nameJa} groupColor={g.color} />
        ))}
        <AttendedTypeBadge attendedType={entry.attendedType} />
      </PendingLink>
      {showNote && entry.note && (
        <p className="mt-1 truncate text-xs text-foreground/50">{entry.note}</p>
      )}
    </li>
  );
}
