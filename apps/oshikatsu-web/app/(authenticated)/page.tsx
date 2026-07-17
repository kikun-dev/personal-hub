import { Suspense } from "react";
import Link from "next/link";
import { EventCalendar } from "@/components/events/EventCalendar";
import { MonthSelector } from "@/components/events/MonthSelector";
import { DailyStoryHeading } from "@/components/home/DailyStoryHeading";
import { NextEvents } from "@/components/top/NextEvents";
import { PastSameDay } from "@/components/top/PastSameDay";
import { RecentAttendance } from "@/components/top/RecentAttendance";
import { DaySchedule } from "@/components/top/DaySchedule";
import {
  getTodayInAppTimeZone,
  parseCalendarDateParams,
} from "@/lib/dateParams";
import { formatMonthDayKanjiWithWeekday } from "@/lib/formatters";
import { requireOrbitUser } from "@/lib/requireOrbitUser";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getRecentAttendance } from "@/usecases/getRecentAttendance";
import { getTopPageData } from "@/usecases/readOrbitMusicData";

type TopPageProps = {
  searchParams: Promise<{ year?: string; month?: string; day?: string }>;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export default async function TopPage({ searchParams }: TopPageProps) {
  const params = await searchParams;
  const now = getTodayInAppTimeZone();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();
  const todayDateStr = `${todayYear}-${pad(todayMonth)}-${pad(todayDay)}`;

  const { year, month, day } = parseCalendarDateParams(params, now);
  const selectedDateStr = `${year}-${pad(month)}-${pad(day)}`;
  const isSelectedToday = selectedDateStr === todayDateStr;
  const pastSameDayTitle = isSelectedToday
    ? "過去の今日"
    : `過去の${month}月${day}日`;
  // URLへdayが明示されている場合のみ「カレンダーへ戻る」導線を出す（today表示でも同様）。
  const hasDayParam = params.day !== undefined;

  const {
    monthEvents,
    selectedDateEvents,
    onThisDayEvents,
    todayEvents,
    nextEvents,
  } = await getTopPageData(year, month, day, todayYear, todayMonth, todayDay);

  // 参加記録は本人限定データ（ADR 0009）のため、グローバルデータの shared read
  // cache 経路（readOrbitMusicData.ts）ではなく、mypage と同じ認証付き入口から
  // 直接取得する（キャッシュ・認可方針を変えない）。
  const { supabase } = await requireOrbitUser();
  const attendanceRepo = createAttendanceRepository(supabase);
  const recentAttendance = await getRecentAttendance(attendanceRepo);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-8">
        <section className="space-y-5">
          {isSelectedToday ? (
            <div>
              <DailyStoryHeading
                selectedDateStr={selectedDateStr}
                className="text-xl font-bold text-foreground"
              >
                今日のSakalog
              </DailyStoryHeading>
              <p className="mt-1 text-sm text-foreground-secondary">
                {formatMonthDayKanjiWithWeekday(todayDateStr)}
              </p>
              {hasDayParam && (
                <p className="mt-2">
                  <Link
                    href="#calendar"
                    className="text-sm text-foreground-secondary hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  >
                    ↓ カレンダーへ戻る
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-foreground-secondary">選んだ日のSakalog</p>
              <DailyStoryHeading
                selectedDateStr={selectedDateStr}
                className="mt-1 text-xl font-bold text-foreground"
              >
                {year}年{formatMonthDayKanjiWithWeekday(selectedDateStr)}
              </DailyStoryHeading>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <Link
                  href="/"
                  className="text-sm text-foreground-secondary hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  ← 今日へ戻る
                </Link>
                {hasDayParam && (
                  <Link
                    href="#calendar"
                    className="text-sm text-foreground-secondary hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  >
                    ↓ カレンダーへ戻る
                  </Link>
                )}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              {isSelectedToday ? "今日の予定" : `${month}月${day}日の予定`}
            </h2>
            {/* key: 日付変更時に再マウントし、展開状態が別日の文脈へ残らないよう初期化する */}
            <DaySchedule
              key={selectedDateStr}
              events={isSelectedToday ? todayEvents : selectedDateEvents}
              emptyMessage={
                isSelectedToday
                  ? "今日の予定はありません"
                  : `${month}月${day}日の予定はありません`
              }
            />
          </div>
        </section>

        {/* Mobile: 過去の同日 → 次のイベント → 最近の参加記録 の縦積み。
            Desktop(lg): NextEvents は rail 側にあるため隠し、過去の同日(広) + 参加記録(狭) の横並び。
            display:none はグリッドフローから外れるため単一 DOM で両順序を満たせる（#345）。 */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-6">
          {/* key: DaySchedule と同様、日付変更時に展開状態を初期化する */}
          <PastSameDay
            key={selectedDateStr}
            events={onThisDayEvents}
            title={pastSameDayTitle}
            currentYear={year}
          />
          <div className="lg:hidden">
            <NextEvents events={nextEvents} today={now} frame="plain" />
          </div>
          <RecentAttendance overview={recentAttendance} />
        </div>

        <section className="space-y-6">
          <h2 id="calendar" className="text-sm font-semibold text-foreground">
            日付から探す
          </h2>

          <div className="flex items-center">
            <Suspense fallback={<div className="h-10" />}>
              <MonthSelector
                year={year}
                month={month}
                day={day}
                showTodayButton
                splitTodayButton
              />
            </Suspense>
          </div>

          <EventCalendar
            events={monthEvents}
            year={year}
            month={month}
            selectedDateStr={selectedDateStr}
          />
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-6">
          <NextEvents events={nextEvents} today={now} />
        </div>
      </aside>
    </div>
  );
}
