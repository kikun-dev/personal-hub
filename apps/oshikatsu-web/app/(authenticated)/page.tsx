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
import { parseCalendarDateParams } from "@/lib/dateParams";

type TopPageProps = {
  searchParams: Promise<{ year?: string; month?: string; day?: string }>;
};

export default async function TopPage({ searchParams }: TopPageProps) {
  const params = await searchParams;
  const now = new Date();
  const { year, month, day } = parseCalendarDateParams(params, now);
  const selectedDate = new Date(year, month - 1, day);
  const selectedDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const supabase = await createClient();
  const eventRepo = createEventRepository(supabase);
  const memberRepo = createMemberRepository(supabase);

  const [monthEvents, selectedDateEvents, onThisDayEvents] = await Promise.all([
    getEventsForMonth(eventRepo, memberRepo, year, month),
    getEventsForDate(eventRepo, memberRepo, selectedDate),
    getOnThisDay(eventRepo, selectedDate),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Orbit</h1>
        <Suspense fallback={<div className="h-10" />}>
          <MonthSelector year={year} month={month} day={day} showTodayButton />
        </Suspense>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EventCalendar
          events={monthEvents}
          year={year}
          month={month}
          selectedDateStr={selectedDateStr}
        />

        <div className="space-y-6">
          <EventList
            events={selectedDateEvents}
            title={`${month}/${day}のイベント`}
            emptyMessage={`${month}/${day}のイベントはありません`}
          />

          <OnThisDay
            events={onThisDayEvents}
            selectedDate={selectedDate}
            title={`${month}/${day}はなんの日`}
          />
        </div>
      </div>
    </div>
  );
}
