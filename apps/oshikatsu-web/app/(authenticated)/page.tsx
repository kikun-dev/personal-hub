import { createClient } from "@personal-hub/supabase/server";
import { createEventRepository } from "@/repositories/eventRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { getEventsForMonth } from "@/usecases/getEventsForMonth";
import { getTodayEvents } from "@/usecases/getTodayEvents";
import { getOnThisDay } from "@/usecases/getOnThisDay";
import { EventCalendar } from "@/components/events/EventCalendar";
import { EventList } from "@/components/events/EventList";
import { OnThisDay } from "@/components/events/OnThisDay";

export default async function TopPage() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const supabase = await createClient();
  const eventRepo = createEventRepository(supabase);
  const memberRepo = createMemberRepository(supabase);

  const [monthEvents, todayEvents, onThisDayEvents] = await Promise.all([
    getEventsForMonth(eventRepo, memberRepo, year, month),
    getTodayEvents(eventRepo, memberRepo, today),
    getOnThisDay(eventRepo, today),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Orbit</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <EventCalendar
          events={monthEvents}
          initialYear={year}
          initialMonth={month}
        />

        <div className="space-y-6">
          <EventList
            events={todayEvents}
            title="今日のイベント"
            emptyMessage="今日のイベントはありません"
          />

          <OnThisDay events={onThisDayEvents} today={today} />
        </div>
      </div>
    </div>
  );
}
