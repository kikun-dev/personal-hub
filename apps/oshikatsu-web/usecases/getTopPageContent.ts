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

// year/month（1始まり）に delta か月を加算した年月を返す。
function addMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const NEXT_EVENTS_LIMIT = 4;
// Next Events rail の探索窓（今日の月を含む12 calendar months、#344 レビュー対応）。
// ライブ/リリース/動画/カスタムイベント/誕生日のすべての候補をこの窓でフィルタし、
// 窓外のイベントが窓内のイベントを押しのけないようにする。
const NEXT_EVENTS_WINDOW_MONTHS = 12;
// カスタムイベント・誕生日はバッチ1（今日の月+2か月=3か月）→ バッチ2（残り9か月）の
// 最大2回の並列取得で窓全体をカバーする。
const NEXT_EVENTS_BATCH1_MONTHS = 3;

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
  const selectedDate = new Date(year, month - 1, day);
  const todayDate = new Date(todayYear, todayMonth - 1, todayDay);
  const todayStr = `${todayYear}-${pad(todayMonth)}-${pad(todayDay)}`;

  // 選択日=今日のとき、下段の重複フェッチを避けるための判定（#344 レビュー対応）。
  const isSelectedDateToday =
    year === todayYear && month === todayMonth && day === todayDay;

  const [
    monthEventsRaw,
    onThisDayBaseEvents,
    livePerformances,
    releaseItems,
    videoItems,
    todayBaseEvents,
    selectedDateEventsRaw,
  ] = await Promise.all([
    getEventsForMonth(eventRepo, memberRepo, year, month),
    getOnThisDay(eventRepo, selectedDate),
    liveRepo.findCalendarPerformances(),
    releaseRepo.findCalendarItems(),
    songRepo.findCalendarVideoItems(),
    getEventsForDate(eventRepo, memberRepo, todayDate),
    // 選択日が今日と同じ場合は todayBaseEvents 側の結果を共有するため、ここでは取得しない。
    isSelectedDateToday
      ? Promise.resolve<CalendarEvent[]>([])
      : getEventsForDate(eventRepo, memberRepo, selectedDate),
  ]);

  // 共有の有無に関わらず、以降で push するため必ず clone してから使う。
  const monthEvents = monthEventsRaw.slice();
  const selectedDateEvents = (
    isSelectedDateToday ? todayBaseEvents : selectedDateEventsRaw
  ).slice();

  // 同一ライブ・同一日（昼夜公演など）はカレンダー上で1件に集約する（#344 レビュー対応）。
  // 集約前は Map で最後の1件が任意に残る不具合があったため、全公演を畳み込む形に変更した。
  const performancesByKey = new Map<
    string,
    {
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
        liveId: first.liveId,
        liveName: first.liveName,
        date: first.date,
        startsAt: startsAtValues.length > 0 ? startsAtValues[0] : null,
        venueName,
        performanceCount: perfs.length,
      };
    }
  );

  const monthPrefix = `${year}-${pad(month)}`;
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  const monthDaySuffix = `-${pad(month)}-${pad(day)}`;

  const toLiveEvent = (p: {
    liveId: string;
    liveName: string;
    date: string;
    startsAt: string | null;
    venueName: string | null;
    performanceCount: number;
  }): LiveCalendarEvent => ({
    type: "live",
    id: `${p.liveId}:${p.date}`,
    liveId: p.liveId,
    name: p.liveName,
    date: p.date,
    startsAt: p.startsAt,
    venueName: p.venueName,
    performanceCount: p.performanceCount,
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
  selectedDateEvents.sort(compareDailyEvents);

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
  onThisDayEvents.sort(
    (a, b) => b.date.localeCompare(a.date) || compareDailyEvents(a, b)
  );

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
  todayEvents.sort(compareDailyEvents);

  // Next Events rail（#344 レビュー対応）: 探索窓 = 今日の月を含む12 calendar months。
  // 窓終端（exclusive）= 今日の月の12か月後の月初日。ライブ/リリース/動画は無制限 horizon の
  // 全件取得済みリストから拾えるが、窓外の候補がカスタムイベント・誕生日（窓内の月しか
  // 取得しない）を押しのけないよう、ここで同じ窓条件（date > todayStr && date < 窓終端）を適用する。
  const windowEnd = addMonths(
    todayYear,
    todayMonth,
    NEXT_EVENTS_WINDOW_MONTHS
  );
  const windowEndStr = `${windowEnd.year}-${pad(windowEnd.month)}-01`;

  const nextEventCandidates: CalendarEvent[] = [];
  for (const p of uniqueLivePerformances) {
    if (p.date > todayStr && p.date < windowEndStr) {
      nextEventCandidates.push(toLiveEvent(p));
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

  // カスタムイベント・誕生日は月単位のメソッドしか無いため、窓（12か月）を
  // バッチ1（今日の月+2か月=3か月）→ バッチ2（残り9か月）の最大2回の Promise.all で取得する。
  // 走査月が選択月（引数 year/month）と一致する場合は monthEventsRaw を再利用し、
  // 重複取得を避ける（バッチ1・バッチ2のどちらでも成立し得る）。
  const fetchMonthEvents = (coord: {
    year: number;
    month: number;
  }): Promise<CalendarEvent[]> =>
    coord.year === year && coord.month === month
      ? Promise.resolve(monthEventsRaw)
      : getEventsForMonth(eventRepo, memberRepo, coord.year, coord.month);

  const batch1Coords = Array.from({ length: NEXT_EVENTS_BATCH1_MONTHS }, (_, i) =>
    addMonths(todayYear, todayMonth, i)
  );
  const batch1Results = await Promise.all(batch1Coords.map(fetchMonthEvents));
  for (const monthlyEvents of batch1Results) {
    for (const e of monthlyEvents) {
      if (e.date > todayStr) nextEventCandidates.push(e);
    }
  }
  nextEventCandidates.sort(compareForNextEvents);

  // バッチ1確定条件: 上位4件の4件目の日付が「バッチ1終端の翌月初日」より前であること。
  const batch1End = addMonths(
    todayYear,
    todayMonth,
    NEXT_EVENTS_BATCH1_MONTHS
  );
  const batch1EndStr = `${batch1End.year}-${pad(batch1End.month)}-01`;
  const confirmedAfterBatch1 =
    nextEventCandidates.length >= NEXT_EVENTS_LIMIT &&
    nextEventCandidates[NEXT_EVENTS_LIMIT - 1].date < batch1EndStr;

  if (!confirmedAfterBatch1) {
    // バッチ2 = 残り9か月（窓全体を走査し終えるため、以降の追加判定は不要）。
    const batch2Coords = Array.from(
      { length: NEXT_EVENTS_WINDOW_MONTHS - NEXT_EVENTS_BATCH1_MONTHS },
      (_, i) => addMonths(todayYear, todayMonth, NEXT_EVENTS_BATCH1_MONTHS + i)
    );
    const batch2Results = await Promise.all(batch2Coords.map(fetchMonthEvents));
    for (const monthlyEvents of batch2Results) {
      for (const e of monthlyEvents) {
        if (e.date > todayStr) nextEventCandidates.push(e);
      }
    }
    nextEventCandidates.sort(compareForNextEvents);
  }

  const nextEvents = nextEventCandidates.slice(0, NEXT_EVENTS_LIMIT);

  return {
    monthEvents,
    onThisDayEvents,
    selectedDateEvents,
    todayEvents,
    nextEvents,
  };
}
