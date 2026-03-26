import type { CalendarEvent, Event } from "@/types/event";
import type { EventRepository, MemberRepository } from "@/types/repositories";
import { getEventsForDate } from "@/usecases/getEventsForDate";
import { getEventsForMonth } from "@/usecases/getEventsForMonth";
import { getOnThisDay } from "@/usecases/getOnThisDay";

export type TopPageContent = {
  monthEvents: CalendarEvent[];
  selectedDateEvents: CalendarEvent[];
  onThisDayEvents: Event[];
};

export async function getTopPageContent(
  eventRepo: EventRepository,
  memberRepo: MemberRepository,
  year: number,
  month: number,
  day: number
): Promise<TopPageContent> {
  const selectedDate = new Date(year, month - 1, day);

  const [monthEvents, selectedDateEvents, onThisDayEvents] = await Promise.all([
    getEventsForMonth(eventRepo, memberRepo, year, month),
    getEventsForDate(eventRepo, memberRepo, selectedDate),
    getOnThisDay(eventRepo, selectedDate),
  ]);

  return {
    monthEvents,
    onThisDayEvents,
    selectedDateEvents,
  };
}
