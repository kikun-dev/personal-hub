import type { EventRepository, MemberRepository } from "@/types/repositories";
import type { CalendarEvent } from "@/types/event";
import { calculateAge } from "@/lib/formatters";

export async function getEventsForMonth(
  eventRepo: EventRepository,
  memberRepo: MemberRepository,
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const [events, birthdayMembers] = await Promise.all([
    eventRepo.findByMonth(year, month),
    memberRepo.findBirthdaysByMonth(month),
  ]);

  const calendarEvents: CalendarEvent[] = events.map((e) => ({
    ...e,
    type: "event" as const,
  }));

  for (const member of birthdayMembers) {
    const birth = new Date(member.dateOfBirth + "T00:00:00");
    const day = birth.getDate();
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    calendarEvents.push({
      type: "birthday",
      memberId: member.id,
      memberName: member.nameJa,
      date: dateStr,
      age: calculateAge(member.dateOfBirth, new Date(dateStr + "T00:00:00")),
      groupNames: member.groupNames,
    });
  }

  calendarEvents.sort((a, b) => a.date.localeCompare(b.date));

  return calendarEvents;
}
