import type {
  CalendarEvent,
  LiveCalendarEvent,
  OnThisDayItem,
  ReleaseCalendarEvent,
  VideoCalendarEvent,
} from "@/types/event";
import type {
  EventRepository,
  LiveRepository,
  MemberRepository,
  ReleaseRepository,
  SongRepository,
} from "@/types/repositories";
import type { CalendarVideoItem } from "@/types/song";
import { formatSongVideoTypeLabel } from "@/types/song";
import { getEventsForDate } from "@/usecases/getEventsForDate";
import { getEventsForMonth } from "@/usecases/getEventsForMonth";
import { getOnThisDay } from "@/usecases/getOnThisDay";

export type TopPageContent = {
  monthEvents: CalendarEvent[];
  selectedDateEvents: CalendarEvent[];
  onThisDayEvents: OnThisDayItem[];
  // Daily Story 構成（#344）: 「今日の予定」用。選択日に関わらず常に「今日」の一覧。
  todayEvents: CalendarEvent[];
  // Next Events rail（#344）用。今日より後の直近4件（日付昇順）。
  nextEvents: CalendarEvent[];
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

const NEXT_EVENTS_LIMIT = 4;

export async function getTopPageContent(
  eventRepo: EventRepository,
  memberRepo: MemberRepository,
  liveRepo: LiveRepository,
  releaseRepo: ReleaseRepository,
  songRepo: SongRepository,
  year: number,
  month: number,
  day: number,
  // 選択日（year/month/day）とは独立した「今日」。選択日が今日以外でも
  // todayEvents / nextEvents は常にこの日付を基準に計算する。
  todayYear: number,
  todayMonth: number,
  todayDay: number
): Promise<TopPageContent> {
  const selectedDate = new Date(year, month - 1, day);
  const todayDate = new Date(todayYear, todayMonth - 1, todayDay);
  const todayStr = `${todayYear}-${pad(todayMonth)}-${pad(todayDay)}`;
  const nextMonthDate = new Date(todayYear, todayMonth, 1);

  const [
    monthEvents,
    selectedDateEvents,
    onThisDayBaseEvents,
    livePerformances,
    releaseItems,
    videoItems,
    todayBaseEvents,
    thisMonthEventsForNext,
    nextMonthEventsForNext,
  ] = await Promise.all([
    getEventsForMonth(eventRepo, memberRepo, year, month),
    getEventsForDate(eventRepo, memberRepo, selectedDate),
    getOnThisDay(eventRepo, selectedDate),
    liveRepo.findCalendarPerformances(),
    releaseRepo.findCalendarItems(),
    songRepo.findCalendarVideoItems(),
    getEventsForDate(eventRepo, memberRepo, todayDate),
    // Next Events rail 用: カスタムイベント・誕生日は月単位のメソッドしか無いため、
    // 今日の月 + 翌月の2回分を取得して today < date でフィルタする（#344）。
    getEventsForMonth(eventRepo, memberRepo, todayYear, todayMonth),
    getEventsForMonth(
      eventRepo,
      memberRepo,
      nextMonthDate.getFullYear(),
      nextMonthDate.getMonth() + 1
    ),
  ]);

  // 同一ライブ・同一日（昼夜公演など）はカレンダー上で1件に集約する
  const uniqueLivePerformances = Array.from(
    new Map(
      livePerformances.map((p) => [`${p.liveId}:${p.date}`, p])
    ).values()
  );

  const monthPrefix = `${year}-${pad(month)}`;
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  const monthDaySuffix = `-${pad(month)}-${pad(day)}`;

  const toLiveEvent = (p: {
    liveId: string;
    liveName: string;
    date: string;
    startsAt?: string | null;
    venueName?: string | null;
  }): LiveCalendarEvent => ({
    type: "live",
    id: `${p.liveId}:${p.date}`,
    liveId: p.liveId,
    name: p.liveName,
    date: p.date,
    startsAt: p.startsAt ?? null,
    venueName: p.venueName ?? null,
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

  const toVideoEvent = (v: CalendarVideoItem): VideoCalendarEvent | null => {
    const videoLabel =
      v.videoType === "mv"
        ? "MV"
        : formatSongVideoTypeLabel(v.videoType, v.groupNameJa);
    if (!videoLabel) return null;
    return {
      type: "video",
      id: `${v.trackId}:${v.videoType}`,
      trackId: v.trackId,
      trackTitle: v.trackTitle,
      videoLabel,
      url: v.url,
      date: v.date,
    };
  };

  const videoEvents = videoItems
    .map(toVideoEvent)
    .filter((event): event is VideoCalendarEvent => event !== null);

  // 月のカレンダー
  for (const p of uniqueLivePerformances) {
    if (p.date.startsWith(monthPrefix)) monthEvents.push(toLiveEvent(p));
  }
  for (const r of releaseItems) {
    if (r.date.startsWith(monthPrefix)) monthEvents.push(toReleaseEvent(r));
  }
  for (const v of videoEvents) {
    if (v.date.startsWith(monthPrefix)) monthEvents.push(v);
  }
  monthEvents.sort((a, b) => a.date.localeCompare(b.date));

  // 選択日
  for (const p of uniqueLivePerformances) {
    if (p.date === dateStr) selectedDateEvents.push(toLiveEvent(p));
  }
  for (const v of videoEvents) {
    if (v.date === dateStr) selectedDateEvents.push(v);
  }
  for (const r of releaseItems) {
    if (r.date === dateStr) selectedDateEvents.push(toReleaseEvent(r));
  }

  // 今日はなんの日（過去・同じ月日）
  const onThisDayEvents: OnThisDayItem[] = onThisDayBaseEvents.map((e) => ({
    ...e,
    type: "event" as const,
  }));
  for (const p of uniqueLivePerformances) {
    if (p.date.endsWith(monthDaySuffix) && p.date < dateStr) {
      onThisDayEvents.push(toLiveEvent(p));
    }
  }
  for (const r of releaseItems) {
    if (r.date.endsWith(monthDaySuffix) && r.date < dateStr) {
      onThisDayEvents.push(toReleaseEvent(r));
    }
  }
  for (const v of videoEvents) {
    if (v.date.endsWith(monthDaySuffix) && v.date < dateStr) {
      onThisDayEvents.push(v);
    }
  }
  onThisDayEvents.sort((a, b) => b.date.localeCompare(a.date));

  // 今日の予定（#344）: selectedDateEvents と同一ロジックを「今日」の日付で計算する。
  const todayEvents: CalendarEvent[] = todayBaseEvents.slice();
  for (const p of uniqueLivePerformances) {
    if (p.date === todayStr) todayEvents.push(toLiveEvent(p));
  }
  for (const v of videoEvents) {
    if (v.date === todayStr) todayEvents.push(v);
  }
  for (const r of releaseItems) {
    if (r.date === todayStr) todayEvents.push(toReleaseEvent(r));
  }

  // Next Events rail（#344）: 今日より後（date > todayStr）のイベントを日付昇順で先頭4件。
  // カスタムイベント・誕生日は今日の月 + 翌月の2回分から拾う（それ以降の月は対象外）。
  const nextEvents: CalendarEvent[] = [];
  for (const p of uniqueLivePerformances) {
    if (p.date > todayStr) nextEvents.push(toLiveEvent(p));
  }
  for (const r of releaseItems) {
    if (r.date > todayStr) nextEvents.push(toReleaseEvent(r));
  }
  for (const v of videoEvents) {
    if (v.date > todayStr) nextEvents.push(v);
  }
  for (const e of [...thisMonthEventsForNext, ...nextMonthEventsForNext]) {
    if (e.date > todayStr) nextEvents.push(e);
  }
  nextEvents.sort((a, b) => a.date.localeCompare(b.date));

  return {
    monthEvents,
    onThisDayEvents,
    selectedDateEvents,
    todayEvents,
    nextEvents: nextEvents.slice(0, NEXT_EVENTS_LIMIT),
  };
}
