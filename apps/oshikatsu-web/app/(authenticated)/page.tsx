import { Suspense } from "react";
import { createClient } from "@personal-hub/supabase/server";
import { createEventRepository } from "@/repositories/eventRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { getEventsForMonth } from "@/usecases/getEventsForMonth";
import { getTodayEvents } from "@/usecases/getTodayEvents";
import { getOnThisDay } from "@/usecases/getOnThisDay";
import { EventCalendar } from "@/components/events/EventCalendar";
import { EventList } from "@/components/events/EventList";
import { OnThisDay } from "@/components/events/OnThisDay";
import { MonthSelector } from "@/components/events/MonthSelector";
import { parseMonthParams } from "@/lib/dateParams";

type TopPageProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

export default async function TopPage({ searchParams }: TopPageProps) {
  const params = await searchParams;
  const now = new Date();
  const { year, month } = parseMonthParams(params);

  const supabase = await createClient();
  const eventRepo = createEventRepository(supabase);
  const memberRepo = createMemberRepository(supabase);

  const [monthEvents, todayEvents, onThisDayEvents] = await Promise.all([
    getEventsForMonth(eventRepo, memberRepo, year, month),
    getTodayEvents(eventRepo, memberRepo, now),
    getOnThisDay(eventRepo, now),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Orbit</h1>
        <Suspense fallback={<div className="h-10" />}>
          <MonthSelector year={year} month={month} />
        </Suspense>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EventCalendar events={monthEvents} year={year} month={month} />

        <div className="space-y-6">
          <EventList
            events={todayEvents}
            title="今日のイベント"
            emptyMessage="今日のイベントはありません"
          />

          <OnThisDay events={onThisDayEvents} today={now} />
        </div>
      </div>
    </div>
  );
}
