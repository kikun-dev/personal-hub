import { Suspense } from "react";
import { EventCalendar } from "@/components/events/EventCalendar";
import { EventList } from "@/components/events/EventList";
import { OnThisDay } from "@/components/events/OnThisDay";
import { MonthSelector } from "@/components/events/MonthSelector";
import { NextEvents } from "@/components/top/NextEvents";
import { RecentAttendance } from "@/components/top/RecentAttendance";
import { TodaySchedule } from "@/components/top/TodaySchedule";
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
  const eventListTitle = `${month}/${day}のイベント`;
  const eventListEmptyMessage = `${month}/${day}のイベントはありません`;
  const onThisDayTitle = isSelectedToday
    ? "今日はなんの日"
    : `${month}/${day}はなんの日`;

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
          <div>
            <h1 className="text-xl font-bold text-foreground">今日のSakalog</h1>
            <p className="mt-1 text-sm text-foreground/60">
              {formatMonthDayKanjiWithWeekday(todayDateStr)}
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              今日の予定
            </h2>
            <TodaySchedule events={todayEvents} />
          </div>
        </section>

        <div className="lg:hidden">
          <NextEvents events={nextEvents} today={now} frame="plain" />
        </div>

        <RecentAttendance overview={recentAttendance} />

        <section className="space-y-6">
          <h2 id="calendar" className="text-sm font-semibold text-foreground">
            カレンダー
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

          <div
            className={`grid gap-6 ${isSelectedToday ? "" : "md:grid-cols-2"}`}
          >
            {!isSelectedToday && (
              <EventList
                events={selectedDateEvents}
                title={eventListTitle}
                emptyMessage={eventListEmptyMessage}
              />
            )}

            <OnThisDay
              events={onThisDayEvents}
              selectedDate={new Date(year, month - 1, day)}
              title={onThisDayTitle}
            />
          </div>
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
