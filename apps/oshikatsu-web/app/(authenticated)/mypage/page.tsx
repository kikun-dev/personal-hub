import { requireOrbitUser } from "@/lib/requireOrbitUser";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getMyAttendanceHistory } from "@/usecases/getMyAttendanceHistory";
import { AttendanceListItem } from "@/components/mypage/AttendanceListItem";
import { LaterLivesToggle } from "@/components/mypage/LaterLivesToggle";
import { UpcomingCard } from "@/components/mypage/UpcomingCard";
import { TextLink } from "@/components/ui/TextLink";
import { APP_ROUTES } from "@/lib/routes";

export default async function MyPage() {
  // ユーザー別データ（ADR 0009）の入口。admin / viewer 以外は requireOrbitUser 内で
  // リダイレクトされる。以降の read は認証付きクライアント + RLS（本人分のみ）に委ねる。
  const { supabase } = await requireOrbitUser();
  const attendanceRepo = createAttendanceRepository(supabase);
  const { summary, nextLive, laterUpcoming, thisYearPast, undated } =
    await getMyAttendanceHistory(attendanceRepo);

  // 「まだ参戦記録がありません」は全体0件のときだけ表示する
  // （未来の予定や日程未定の記録だけがある場合、過去セクションには専用の空文言を出す）
  const hasAnyAttendance = summary.totalCount > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-foreground">マイページ</h1>

      <p className="text-sm text-foreground/70">
        今後の予定 <span className="font-semibold text-foreground">{summary.upcomingCount}</span> 件
        ・今年の参戦 <span className="font-semibold text-foreground">{summary.thisYearCount}</span> 件
        ・総ライブ数 <span className="font-semibold text-foreground">{summary.totalCount}</span> 件
      </p>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">次のライブ</h2>
        {nextLive === null ? (
          <p className="text-sm text-foreground/60">予定はありません</p>
        ) : (
          <div className="max-w-sm">
            <UpcomingCard entry={nextLive} />
          </div>
        )}
        {laterUpcoming.length > 0 && <LaterLivesToggle entries={laterUpcoming} />}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">今年の参戦記録</h2>
          {hasAnyAttendance && (
            <div className="flex flex-wrap items-center gap-3">
              <TextLink
                href={APP_ROUTES.mypageSetlist}
                feedback="global"
                className="text-xs"
              >
                セトリログ
              </TextLink>
              <TextLink
                href={APP_ROUTES.mypageVenues}
                feedback="global"
                className="text-xs"
              >
                参戦会場
              </TextLink>
              <TextLink
                href={APP_ROUTES.mypageStats}
                feedback="global"
                className="text-xs"
              >
                ライブ記録
              </TextLink>
            </div>
          )}
        </div>
        {thisYearPast.length === 0 ? (
          hasAnyAttendance ? (
            <p className="text-sm text-foreground/60">
              今年の参戦記録はありません。
              <TextLink
                href={APP_ROUTES.mypageStats}
                feedback="global"
                className="ml-1"
              >
                昨年以前の記録はライブ記録
              </TextLink>
              で確認できます。
            </p>
          ) : (
            <p className="text-sm text-foreground/60">
              まだ参戦記録がありません。
              <TextLink
                href={APP_ROUTES.lives}
                feedback="global"
                className="ml-1"
              >
                ライブ一覧
              </TextLink>
              から登録しましょう。
            </p>
          )
        ) : (
          <ul className="space-y-2">
            {thisYearPast.map((entry) => (
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
