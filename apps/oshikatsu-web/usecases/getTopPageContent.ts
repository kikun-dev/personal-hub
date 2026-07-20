import type {
  BirthdayEvent,
  CalendarEvent,
  LiveCalendarEvent,
  OnThisDayItem,
  ReleaseCalendarEvent,
  VideoCalendarEvent,
} from "@/types/event";
import type {
  CalendarDateRange,
  EventRepository,
  LiveRepository,
  MemberRepository,
  ReleaseRepository,
  SongRepository,
} from "@/types/repositories";
import type { BirthdayMember } from "@/types/member";
import type { CalendarVideoItem } from "@/types/song";
import { formatSongVideoTypeLabel } from "@/types/song";
import { calculateAge } from "@/lib/formatters";

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

// year/month（1始まり）に delta か月を加算した年月を返す。
function addMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// #400 追補2: Next Events から「すべて見る」導線を廃止した代わりに、直近の予定を
// 少し先まで見せるため 4→6 に増やす。
const NEXT_EVENTS_LIMIT = 6;
// Next Events rail の探索窓（今日の月を含む12 calendar months、#344 レビュー対応）。
// ライブ/リリース/動画/カスタムイベント/誕生日のすべての候補をこの窓でフィルタし、
// 窓外のイベントが窓内のイベントを押しのけないようにする。
const NEXT_EVENTS_WINDOW_MONTHS = 12;

function toMonthStart(year: number, month: number): string {
  return `${year}-${pad(month)}-01`;
}

function buildCalendarRanges(
  selectedYear: number,
  selectedMonth: number,
  todayYear: number,
  todayMonth: number
): CalendarDateRange[] {
  const selectedEnd = addMonths(selectedYear, selectedMonth, 1);
  const windowEnd = addMonths(todayYear, todayMonth, NEXT_EVENTS_WINDOW_MONTHS);
  const ranges: CalendarDateRange[] = [
    {
      startDate: toMonthStart(selectedYear, selectedMonth),
      endDate: toMonthStart(selectedEnd.year, selectedEnd.month),
    },
    {
      startDate: toMonthStart(todayYear, todayMonth),
      endDate: toMonthStart(windowEnd.year, windowEnd.month),
    },
  ].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const [first, second] = ranges;
  if (second.startDate <= first.endDate) {
    return [
      {
        startDate: first.startDate,
        endDate:
          first.endDate >= second.endDate ? first.endDate : second.endDate,
      },
    ];
  }
  return ranges;
}

function toBirthdayEvent(
  member: BirthdayMember,
  year: number,
  month: number
): BirthdayEvent {
  const day = Number(member.dateOfBirth.slice(8, 10));
  const date = `${year}-${pad(month)}-${pad(day)}`;
  return {
    type: "birthday",
    memberId: member.id,
    memberName: member.nameJa,
    date,
    age: calculateAge(member.dateOfBirth, new Date(`${date}T00:00:00`)),
    groupNames: member.groupNames,
  };
}

function findBirthdayEventsForMonth(
  members: BirthdayMember[],
  year: number,
  month: number
): BirthdayEvent[] {
  return members
    .filter((member) => Number(member.dateOfBirth.slice(5, 7)) === month)
    .map((member) => toBirthdayEvent(member, year, month));
}

// 日次一覧（今日の予定・選択日・Next Events 同日内）の並び規則（#344 レビュー対応）:
// 1. 時刻の無い予定が先。種別順: 誕生日 → リリース → 動画 → ライブ → カスタムイベント
// 2. 時刻のある予定は時刻昇順（ライブ = 集約後の最早 startsAt、カスタム = startTime）
// 3. 同値の tie-breaker: 種別順（1と同じ順）→ 名称（name / title / memberName / trackTitle）昇順
const DAILY_EVENT_TYPE_ORDER: Record<CalendarEvent["type"], number> = {
  birthday: 0,
  release: 1,
  video: 2,
  live: 3,
  event: 4,
};

function getDailyEventTime(event: CalendarEvent): string | null {
  if (event.type === "live") return event.startsAt;
  if (event.type === "event") return event.startTime;
  return null;
}

function getDailyEventName(event: CalendarEvent): string {
  switch (event.type) {
    case "live":
      return event.name;
    case "release":
      return event.title;
    case "video":
      return event.trackTitle;
    case "birthday":
      return event.memberName;
    case "event":
      return event.title;
  }
}

function compareDailyEvents(a: CalendarEvent, b: CalendarEvent): number {
  const timeA = getDailyEventTime(a);
  const timeB = getDailyEventTime(b);
  if ((timeA === null) !== (timeB === null)) {
    return timeA === null ? -1 : 1;
  }
  if (timeA !== null && timeB !== null && timeA !== timeB) {
    return timeA < timeB ? -1 : 1;
  }
  const typeDiff = DAILY_EVENT_TYPE_ORDER[a.type] - DAILY_EVENT_TYPE_ORDER[b.type];
  if (typeDiff !== 0) return typeDiff;
  return getDailyEventName(a).localeCompare(getDailyEventName(b));
}

// Next Events rail 用: 日付昇順、同日内は compareDailyEvents に従う。
function compareForNextEvents(a: CalendarEvent, b: CalendarEvent): number {
  const dateDiff = a.date.localeCompare(b.date);
  if (dateDiff !== 0) return dateDiff;
  return compareDailyEvents(a, b);
}

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
  const todayStr = `${todayYear}-${pad(todayMonth)}-${pad(todayDay)}`;
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  const monthPrefix = `${year}-${pad(month)}`;
  const ranges = buildCalendarRanges(year, month, todayYear, todayMonth);

  const [
    calendarBaseEvents,
    onThisDayBaseEvents,
    birthdayMembers,
    livePerformances,
    onThisDayLivePerformances,
    releaseItems,
    onThisDayReleaseItems,
    videoItems,
    onThisDayVideoItems,
  ] = await Promise.all([
    eventRepo.findCalendarEventsInRanges(ranges),
    eventRepo.findOnThisDay(month, day),
    memberRepo.findAllBirthdays(),
    liveRepo.findCalendarPerformancesInRanges(ranges),
    liveRepo.findCalendarPerformancesOnThisDay(month, day),
    releaseRepo.findCalendarItemsInRanges(ranges),
    releaseRepo.findCalendarItemsOnThisDay(month, day),
    songRepo.findCalendarVideoItemsInRanges(ranges),
    songRepo.findCalendarVideoItemsOnThisDay(month, day),
  ]);

  const monthEvents: CalendarEvent[] = calendarBaseEvents
    .filter((event) => event.date.startsWith(monthPrefix))
    .map((event) => ({ ...event, type: "event" as const }));
  monthEvents.push(...findBirthdayEventsForMonth(birthdayMembers, year, month));

  const selectedDateEvents: CalendarEvent[] = calendarBaseEvents
    .filter((event) => event.date === dateStr)
    .map((event) => ({ ...event, type: "event" as const }));
  selectedDateEvents.push(
    ...findBirthdayEventsForMonth(birthdayMembers, year, month).filter(
      (event) => event.date === dateStr
    )
  );

  const todayEvents: CalendarEvent[] = calendarBaseEvents
    .filter((event) => event.date === todayStr)
    .map((event) => ({ ...event, type: "event" as const }));
  todayEvents.push(
    ...findBirthdayEventsForMonth(
      birthdayMembers,
      todayYear,
      todayMonth
    ).filter((event) => event.date === todayStr)
  );

  // 同一ライブ・同一日（昼夜公演など）はカレンダー上で1件に集約する（#344 レビュー対応）。
  // 集約前は Map で最後の1件が任意に残る不具合があったため、全公演を畳み込む形に変更した。
  // #346: 集約はカレンダー（event dot）用に限定。日次系（selectedDateEvents 等）は
  // performance 単位（1行 = 1公演）で扱うため uniqueLivePerformances は使わない。
  const performancesByKey = new Map<
    string,
    {
      id: string;
      liveId: string;
      liveName: string;
      date: string;
      startsAt: string | null;
      venueName: string | null;
    }[]
  >();
  for (const p of livePerformances) {
    const key = `${p.liveId}:${p.date}`;
    const bucket = performancesByKey.get(key);
    if (bucket) {
      bucket.push(p);
    } else {
      performancesByKey.set(key, [p]);
    }
  }

  const uniqueLivePerformances = Array.from(performancesByKey.values()).map(
    (perfs) => {
      const first = perfs[0];
      // startsAt: 非nullの最早開演時刻（"HH:MM:SS" は固定長のため文字列比較で min を取れる）
      const startsAtValues = perfs
        .map((p) => p.startsAt)
        .filter((s): s is string => s !== null)
        .sort();
      // venueName: 全公演で同一（かつ非null）のときのみ採用。混在/null混じりは null。
      const venueNames = perfs.map((p) => p.venueName);
      const venueName =
        venueNames[0] !== null && venueNames.every((v) => v === venueNames[0])
          ? venueNames[0]
          : null;

      return {
        // 代表値（#346）。集約イベントのリンク描画には使われない。
        performanceId: first.id,
        liveId: first.liveId,
        liveName: first.liveName,
        date: first.date,
        startsAt: startsAtValues.length > 0 ? startsAtValues[0] : null,
        venueName,
        performanceCount: perfs.length,
      };
    }
  );

  const monthDaySuffix = `-${pad(month)}-${pad(day)}`;

  const toLiveEvent = (p: {
    liveId: string;
    liveName: string;
    date: string;
    startsAt: string | null;
    venueName: string | null;
    performanceCount: number;
    // 集約後の代表公演の id（#346）。月間カレンダーの event dot はリンク描画に
    // performanceId を使わないため、どの公演を代表にしても表示上の影響はない。
    performanceId: string;
  }): LiveCalendarEvent => ({
    type: "live",
    id: `${p.liveId}:${p.date}`,
    performanceId: p.performanceId,
    liveId: p.liveId,
    name: p.liveName,
    date: p.date,
    startsAt: p.startsAt,
    venueName: p.venueName,
    performanceCount: p.performanceCount,
  });

  // 日次系リスト用（#346）: 1行 = 1公演。昼夜公演も別行として自身の時刻・会場を持つ。
  const toLivePerformanceEvent = (p: {
    id: string;
    liveId: string;
    liveName: string;
    date: string;
    startsAt: string | null;
    venueName: string | null;
  }): LiveCalendarEvent => ({
    type: "live",
    id: p.id,
    performanceId: p.id,
    liveId: p.liveId,
    name: p.liveName,
    date: p.date,
    startsAt: p.startsAt,
    venueName: p.venueName,
    performanceCount: 1,
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
  const onThisDayVideoEvents = onThisDayVideoItems
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

  // 選択日（#346: performance 単位。1行 = 1公演）
  for (const p of livePerformances) {
    if (p.date === dateStr) selectedDateEvents.push(toLivePerformanceEvent(p));
  }
  for (const v of videoEvents) {
    if (v.date === dateStr) selectedDateEvents.push(v);
  }
  for (const r of releaseItems) {
    if (r.date === dateStr) selectedDateEvents.push(toReleaseEvent(r));
  }
  selectedDateEvents.sort(compareDailyEvents);

  // 今日はなんの日（過去・同じ月日）
  const onThisDayEvents: OnThisDayItem[] = onThisDayBaseEvents
    .filter((event) => event.date < dateStr)
    .map((e) => ({
      ...e,
      type: "event" as const,
    }));
  for (const p of onThisDayLivePerformances) {
    if (p.date.endsWith(monthDaySuffix) && p.date < dateStr) {
      onThisDayEvents.push(toLivePerformanceEvent(p));
    }
  }
  for (const r of onThisDayReleaseItems) {
    if (r.date.endsWith(monthDaySuffix) && r.date < dateStr) {
      onThisDayEvents.push(toReleaseEvent(r));
    }
  }
  for (const v of onThisDayVideoEvents) {
    if (v.date.endsWith(monthDaySuffix) && v.date < dateStr) {
      onThisDayEvents.push(v);
    }
  }
  onThisDayEvents.sort(
    (a, b) => b.date.localeCompare(a.date) || compareDailyEvents(a, b)
  );

  // 今日の予定（#344）: selectedDateEvents と同一ロジックを「今日」の日付で計算する。
  // #346: performance 単位（1行 = 1公演）。
  for (const p of livePerformances) {
    if (p.date === todayStr) todayEvents.push(toLivePerformanceEvent(p));
  }
  for (const v of videoEvents) {
    if (v.date === todayStr) todayEvents.push(v);
  }
  for (const r of releaseItems) {
    if (r.date === todayStr) todayEvents.push(toReleaseEvent(r));
  }
  todayEvents.sort(compareDailyEvents);

  // Next Events rail（#344）: 探索窓 = 今日の月を含む12 calendar months。
  // Repository から受け取る行自体を selected 月 + この窓に限定し、archive 全件 scan を避ける。
  const windowEnd = addMonths(
    todayYear,
    todayMonth,
    NEXT_EVENTS_WINDOW_MONTHS
  );
  const windowEndStr = `${windowEnd.year}-${pad(windowEnd.month)}-01`;

  // #346: performance 単位（1行 = 1公演）。
  const nextEventCandidates: CalendarEvent[] = [];
  for (const p of livePerformances) {
    if (p.date > todayStr && p.date < windowEndStr) {
      nextEventCandidates.push(toLivePerformanceEvent(p));
    }
  }
  for (const r of releaseItems) {
    if (r.date > todayStr && r.date < windowEndStr) {
      nextEventCandidates.push(toReleaseEvent(r));
    }
  }
  for (const v of videoEvents) {
    if (v.date > todayStr && v.date < windowEndStr) {
      nextEventCandidates.push(v);
    }
  }

  for (const event of calendarBaseEvents) {
    if (event.date > todayStr && event.date < windowEndStr) {
      nextEventCandidates.push({ ...event, type: "event" as const });
    }
  }
  for (let offset = 0; offset < NEXT_EVENTS_WINDOW_MONTHS; offset += 1) {
    const coord = addMonths(todayYear, todayMonth, offset);
    const birthdays = findBirthdayEventsForMonth(
      birthdayMembers,
      coord.year,
      coord.month
    );
    for (const birthday of birthdays) {
      if (birthday.date > todayStr && birthday.date < windowEndStr) {
        nextEventCandidates.push(birthday);
      }
    }
  }

  nextEventCandidates.sort(compareForNextEvents);
  const nextEvents = nextEventCandidates.slice(0, NEXT_EVENTS_LIMIT);

  return {
    monthEvents,
    onThisDayEvents,
    selectedDateEvents,
    todayEvents,
    nextEvents,
  };
}
