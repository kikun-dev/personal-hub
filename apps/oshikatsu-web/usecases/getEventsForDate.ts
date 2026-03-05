import type { EventRepository, MemberRepository } from "@/types/repositories";
import type { CalendarEvent } from "@/types/event";
import { calculateAge } from "@/lib/formatters";

export async function getEventsForDate(
  eventRepo: EventRepository,
  memberRepo: MemberRepository,
  targetDate: Date
): Promise<CalendarEvent[]> {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();

  const [events, birthdayMembers] = await Promise.all([
    eventRepo.findByDate(year, month, day),
    memberRepo.findBirthdaysByDate(month, day),
  ]);

  const calendarEvents: CalendarEvent[] = events.map((e) => ({
    ...e,
    type: "event" as const,
  }));

  for (const member of birthdayMembers) {
    if (!member.dateOfBirth) continue;

    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    calendarEvents.push({
      type: "birthday",
      memberId: member.id,
      memberName: member.nameJa,
      date: dateStr,
      age: calculateAge(member.dateOfBirth, targetDate),
      groupNames: member.groups.map((g) => g.groupNameJa),
    });
  }

  return calendarEvents;
}
