import { requireOrbitUser } from "@/lib/requireOrbitUser";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getMyAttendanceHistory } from "@/usecases/getMyAttendanceHistory";
import { AttendedTypeBadge } from "@/components/lives/AttendedTypeBadge";
import { AttendanceListItem } from "@/components/mypage/AttendanceListItem";
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

export default async function MyPage() {
  // ユーザー別データ（ADR 0009）の入口。admin / viewer 以外は requireOrbitUser 内で
  // リダイレクトされる。以降の read は認証付きクライアント + RLS（本人分のみ）に委ねる。
  const { supabase } = await requireOrbitUser();
  const attendanceRepo = createAttendanceRepository(supabase);
  const { upcoming, past, undated } = await getMyAttendanceHistory(attendanceRepo);

  // 「まだ参加記録がありません」は全体0件のときだけ表示する
  // （未来の予定や日程未定の記録だけがある場合、過去セクションには専用の空文言を出す）
  const hasAnyAttendance =
    upcoming.length > 0 || past.length > 0 || undated.length > 0;

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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">過去の参加記録</h2>
          {hasAnyAttendance && (
            <div className="flex flex-wrap items-center gap-3">
              <PendingLink
                href={APP_ROUTES.mypageSetlist}
                feedback="global"
                className="text-xs text-blue-500 hover:underline"
              >
                セットリストを見る
              </PendingLink>
              <PendingLink
                href={APP_ROUTES.mypageVenues}
                feedback="global"
                className="text-xs text-blue-500 hover:underline"
              >
                会場を見る
              </PendingLink>
              <PendingLink
                href={APP_ROUTES.mypageStats}
                feedback="global"
                className="text-xs text-blue-500 hover:underline"
              >
                記録を見る
              </PendingLink>
            </div>
          )}
        </div>
        {past.length === 0 ? (
          hasAnyAttendance ? (
            <p className="text-sm text-foreground/60">過去の参加記録はありません</p>
          ) : (
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
          )
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
