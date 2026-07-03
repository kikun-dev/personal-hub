import { requireOrbitUser } from "@/lib/requireOrbitUser";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getMyAttendanceHistory } from "@/usecases/getMyAttendanceHistory";
import { AttendedTypeBadge } from "@/components/lives/AttendedTypeBadge";
import { PendingLink } from "@/components/ui/PendingLink";
import type { MyAttendanceEntry } from "@/types/attendance";
import { LIVE_TYPE_LABELS } from "@/types/live";
import { formatDate, formatTime } from "@/lib/formatters";
import { APP_ROUTES } from "@/lib/routes";

// 次のライブ: カードで表示（ライブ一覧の LiveCard と同じトーン）
function UpcomingCard({ entry }: { entry: MyAttendanceEntry }) {
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
      </div>
      <div className="mt-2">
        <AttendedTypeBadge attendedType={entry.attendedType} />
      </div>
    </PendingLink>
  );
}

// 過去の参加記録 / 日程未定: 1行リストで表示（VenueDetailPage の公演一覧と同じトーン）
function AttendanceListItem({ entry }: { entry: MyAttendanceEntry }) {
  return (
    <li className="rounded-lg border border-foreground/10 p-3">
      <PendingLink
        href={`/lives/${entry.liveId}`}
        className="flex flex-wrap items-center gap-2 text-sm text-foreground hover:underline"
        listBackFallbackHref={APP_ROUTES.mypage}
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

export default async function MyPage() {
  // ユーザー別データ（ADR 0009）の入口。admin / viewer 以外は requireOrbitUser 内で
  // リダイレクトされる。以降の read は認証付きクライアント + RLS（本人分のみ）に委ねる。
  const { supabase } = await requireOrbitUser();
  const attendanceRepo = createAttendanceRepository(supabase);
  const { upcoming, past, undated } = await getMyAttendanceHistory(attendanceRepo);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-foreground">マイページ</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">次のライブ</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-foreground/60">予定はありません</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((entry) => (
              <UpcomingCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">過去の参加記録</h2>
        {past.length === 0 ? (
          <p className="text-sm text-foreground/60">
            まだ参加記録がありません。
            <PendingLink
              href={APP_ROUTES.lives}
              feedback="global"
              className="ml-1 text-blue-500 hover:underline"
            >
              ライブ一覧
            </PendingLink>
            から参加記録を登録しましょう。
          </p>
        ) : (
          <ul className="space-y-2">
            {past.map((entry) => (
              <AttendanceListItem key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </section>

      {undated.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-foreground/60">日程未定</h2>
          <ul className="space-y-2">
            {undated.map((entry) => (
              <AttendanceListItem key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
