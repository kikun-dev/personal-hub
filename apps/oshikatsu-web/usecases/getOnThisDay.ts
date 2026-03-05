import type { EventRepository } from "@/types/repositories";
import type { Event } from "@/types/event";

export async function getOnThisDay(
  repo: EventRepository,
  targetDate: Date
): Promise<Event[]> {
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  const currentYear = targetDate.getFullYear();

  const events = await repo.findOnThisDay(month, day);

  // 今年のイベントは除外（過去のみ）
  return events.filter((e) => {
    const eventYear = new Date(e.date + "T00:00:00").getFullYear();
    return eventYear < currentYear;
  });
}
