import { Suspense } from "react";
import { createClient } from "@personal-hub/supabase/server";
import { createEventRepository } from "@/repositories/eventRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { getEventsForMonth } from "@/usecases/getEventsForMonth";
import { getEventsForDate } from "@/usecases/getEventsForDate";
import { getOnThisDay } from "@/usecases/getOnThisDay";
import { EventCalendar } from "@/components/events/EventCalendar";
import { EventList } from "@/components/events/EventList";
import { OnThisDay } from "@/components/events/OnThisDay";
import { MonthSelector } from "@/components/events/MonthSelector";
import { TopNavigationPanel } from "@/components/layout/TopNavigationPanel";
import {
  getTodayInAppTimeZone,
  parseCalendarDateParams,
} from "@/lib/dateParams";

type TopPageProps = {
  searchParams: Promise<{ year?: string; month?: string; day?: string }>;
};

export default async function TopPage({ searchParams }: TopPageProps) {
  const params = await searchParams;
  const now = getTodayInAppTimeZone();
  const { year, month, day } = parseCalendarDateParams(params, now);
  const selectedDate = new Date(year, month - 1, day);
  const selectedDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const isSelectedToday =
    year === now.getFullYear() &&
    month === now.getMonth() + 1 &&
    day === now.getDate();
  const eventListTitle = isSelectedToday
    ? "今日のイベント"
    : `${month}/${day}のイベント`;
  const eventListEmptyMessage = isSelectedToday
    ? "今日のイベントはありません"
    : `${month}/${day}のイベントはありません`;
  const onThisDayTitle = isSelectedToday
    ? "今日はなんの日"
    : `${month}/${day}はなんの日`;

  const supabase = await createClient();
  const eventRepo = createEventRepository(supabase);
  const memberRepo = createMemberRepository(supabase);

  const [monthEvents, selectedDateEvents, onThisDayEvents] = await Promise.all([
    getEventsForMonth(eventRepo, memberRepo, year, month),
    getEventsForDate(eventRepo, memberRepo, selectedDate),
    getOnThisDay(eventRepo, selectedDate),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <div className="flex items-center">
          <Suspense fallback={<div className="h-10" />}>
            <MonthSelector year={year} month={month} day={day} showTodayButton />
          </Suspense>
        </div>

        <EventCalendar
          events={monthEvents}
          year={year}
          month={month}
          selectedDateStr={selectedDateStr}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <EventList
            events={selectedDateEvents}
            title={eventListTitle}
            emptyMessage={eventListEmptyMessage}
          />

          <OnThisDay
            events={onThisDayEvents}
            selectedDate={selectedDate}
            title={onThisDayTitle}
          />
        </div>
      </div>

      <aside className="hidden lg:block">
        <TopNavigationPanel />
      </aside>
    </div>
  );
}
