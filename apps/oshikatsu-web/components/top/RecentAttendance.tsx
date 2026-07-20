import { AttendanceListItem } from "@/components/mypage/AttendanceListItem";
import { TextLink } from "@/components/ui/TextLink";
import type { RecentAttendanceOverview } from "@/usecases/getRecentAttendance";
import { APP_ROUTES } from "@/lib/routes";

type RecentAttendanceProps = {
  overview: RecentAttendanceOverview;
};

// トップページ「最近の参加記録」（#344）。本人の参加記録を直近3件だけコンパクト表示し、
// 一覧はマイページへ委ねる（Decision 7: 行動を繰り返し促す CTA は作らない）。
export function RecentAttendance({ overview }: RecentAttendanceProps) {
  const { entries, hasAnyPastAttendance } = overview;

  return (
    <section data-ui="recent-attendance" className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">最近の参加記録</h2>
      {entries.length === 0 ? (
        // 未来の予定だけが登録済みのケースもあるため「過去の」と明示する
        <p className="text-sm text-foreground-secondary">
          過去の参加記録はまだありません
        </p>
      ) : (
        <div
          data-ui="recent-attendance-surface"
          className="rounded-lg border border-border-subtle bg-background"
        >
          <ul className="divide-y divide-border-subtle px-3">
            {entries.map((entry) => (
              <AttendanceListItem
                key={entry.id}
                entry={entry}
                showNote
                variant="row"
              />
            ))}
          </ul>
          {hasAnyPastAttendance && (
            <TextLink
              href={APP_ROUTES.mypage}
              feedback="global"
              className="flex min-h-11 w-full items-center justify-center border-t border-border-subtle px-3 text-center text-xs"
            >
              参加記録をすべて見る →
            </TextLink>
          )}
        </div>
      )}
    </section>
  );
}
