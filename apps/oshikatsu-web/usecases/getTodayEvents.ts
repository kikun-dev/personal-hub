import type { EventRepository, MemberRepository } from "@/types/repositories";
import type { CalendarEvent } from "@/types/event";
import { getEventsForDate } from "./getEventsForDate";

export async function getTodayEvents(
  eventRepo: EventRepository,
  memberRepo: MemberRepository,
  today: Date
): Promise<CalendarEvent[]> {
  return getEventsForDate(eventRepo, memberRepo, today);
}
