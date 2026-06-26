import type {
  CalendarEvent,
  LiveCalendarEvent,
  OnThisDayItem,
  ReleaseCalendarEvent,
} from "@/types/event";
import type {
  EventRepository,
  LiveRepository,
  MemberRepository,
  ReleaseRepository,
} from "@/types/repositories";
import { getEventsForDate } from "@/usecases/getEventsForDate";
import { getEventsForMonth } from "@/usecases/getEventsForMonth";
import { getOnThisDay } from "@/usecases/getOnThisDay";

export type TopPageContent = {
  monthEvents: CalendarEvent[];
  selectedDateEvents: CalendarEvent[];
  onThisDayEvents: OnThisDayItem[];
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export async function getTopPageContent(
  eventRepo: EventRepository,
  memberRepo: MemberRepository,
  liveRepo: LiveRepository,
  releaseRepo: ReleaseRepository,
  year: number,
  month: number,
  day: number
): Promise<TopPageContent> {
  const selectedDate = new Date(year, month - 1, day);

  const [
    monthEvents,
    selectedDateEvents,
    onThisDayBaseEvents,
    livePerformances,
    releaseItems,
  ] = await Promise.all([
    getEventsForMonth(eventRepo, memberRepo, year, month),
    getEventsForDate(eventRepo, memberRepo, selectedDate),
    getOnThisDay(eventRepo, selectedDate),
    liveRepo.findCalendarPerformances(),
    releaseRepo.findCalendarItems(),
  ]);

  const monthPrefix = `${year}-${pad(month)}`;
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  const monthDaySuffix = `-${pad(month)}-${pad(day)}`;

  const toLiveEvent = (p: {
    liveId: string;
    liveName: string;
    date: string;
  }): LiveCalendarEvent => ({
    type: "live",
    id: `${p.liveId}:${p.date}`,
    liveId: p.liveId,
    name: p.liveName,
    date: p.date,
  });

  const toReleaseEvent = (r: {
    releaseId: string;
    title: string;
    date: string;
  }): ReleaseCalendarEvent => ({
    type: "release",
    id: r.releaseId,
    releaseId: r.releaseId,
    title: r.title,
    date: r.date,
  });

  // 月のカレンダー
  for (const p of livePerformances) {
    if (p.date.startsWith(monthPrefix)) monthEvents.push(toLiveEvent(p));
  }
  for (const r of releaseItems) {
    if (r.date.startsWith(monthPrefix)) monthEvents.push(toReleaseEvent(r));
  }
  monthEvents.sort((a, b) => a.date.localeCompare(b.date));

  // 選択日
  for (const p of livePerformances) {
    if (p.date === dateStr) selectedDateEvents.push(toLiveEvent(p));
  }
  for (const r of releaseItems) {
    if (r.date === dateStr) selectedDateEvents.push(toReleaseEvent(r));
  }

  // 今日はなんの日（過去・同じ月日）
  const onThisDayEvents: OnThisDayItem[] = onThisDayBaseEvents.map((e) => ({
    ...e,
    type: "event" as const,
  }));
  for (const p of livePerformances) {
    if (p.date.endsWith(monthDaySuffix) && p.date < dateStr) {
      onThisDayEvents.push(toLiveEvent(p));
    }
  }
  for (const r of releaseItems) {
    if (r.date.endsWith(monthDaySuffix) && r.date < dateStr) {
      onThisDayEvents.push(toReleaseEvent(r));
    }
  }
  onThisDayEvents.sort((a, b) => b.date.localeCompare(a.date));

  return {
    monthEvents,
    onThisDayEvents,
    selectedDateEvents,
  };
}
