import { describe, expect, it } from "vitest";
import type { Event } from "@/types/event";
import type { BirthdayMember } from "@/types/member";
import type {
  CalendarDateRange,
  EventRepository,
  LiveCalendarPerformance,
  LiveRepository,
  MemberRepository,
  ReleaseCalendarItem,
  ReleaseRepository,
  SongRepository,
} from "@/types/repositories";
import type { CalendarVideoItem } from "@/types/song";
import { getTopPageContent } from "@/usecases/getTopPageContent";

type RepositoryCall = {
  name: string;
  args: unknown[];
  rowCount: number;
};

type TopPageFixture = {
  events?: Event[];
  onThisDayEvents?: Event[];
  birthdays?: BirthdayMember[];
  livePerformances?: LiveCalendarPerformance[];
  onThisDayLivePerformances?: LiveCalendarPerformance[];
  releases?: ReleaseCalendarItem[];
  onThisDayReleases?: ReleaseCalendarItem[];
  videos?: CalendarVideoItem[];
  onThisDayVideos?: CalendarVideoItem[];
};

type CountingRepositories = {
  calls: RepositoryCall[];
  eventRepo: EventRepository;
  memberRepo: MemberRepository;
  liveRepo: LiveRepository;
  releaseRepo: ReleaseRepository;
  songRepo: SongRepository;
};

function makeEvent(
  id: string,
  date: string,
  overrides: Partial<Event> = {}
): Event {
  return {
    id,
    eventTypeId: "event-type",
    eventTypeName: "記念日",
    eventTypeColor: "#171717",
    isMemberHistory: false,
    title: `イベント${id}`,
    description: "",
    date,
    endDate: null,
    startTime: null,
    venue: null,
    url: null,
    groupIds: [],
    groupNames: [],
    memberIds: [],
    ...overrides,
  };
}

function makeCountingRepositories(
  fixture: TopPageFixture = {}
): CountingRepositories {
  const calls: RepositoryCall[] = [];
  const count = <T>(name: string, args: unknown[], value: T): Promise<T> => {
    calls.push({ name, args, rowCount: Array.isArray(value) ? value.length : 0 });
    return Promise.resolve(value);
  };

  const eventRepo = {
    findCalendarEventsInRanges(ranges: CalendarDateRange[]) {
      return count("event.findCalendarEventsInRanges", [ranges], fixture.events ?? []);
    },
    findOnThisDay(month: number, day: number) {
      return count(
        "event.findOnThisDay",
        [month, day],
        fixture.onThisDayEvents ?? []
      );
    },
  } as EventRepository;

  const memberRepo = {
    findAllBirthdays() {
      return count("member.findAllBirthdays", [], fixture.birthdays ?? []);
    },
  } as MemberRepository;

  const liveRepo = {
    findCalendarPerformancesInRanges(ranges: CalendarDateRange[]) {
      return count(
        "live.findCalendarPerformancesInRanges",
        [ranges],
        fixture.livePerformances ?? []
      );
    },
    findCalendarPerformancesOnThisDay(month: number, day: number) {
      return count(
        "live.findCalendarPerformancesOnThisDay",
        [month, day],
        fixture.onThisDayLivePerformances ?? []
      );
    },
  } as LiveRepository;

  const releaseRepo = {
    findCalendarItemsInRanges(ranges: CalendarDateRange[]) {
      return count(
        "release.findCalendarItemsInRanges",
        [ranges],
        fixture.releases ?? []
      );
    },
    findCalendarItemsOnThisDay(month: number, day: number) {
      return count(
        "release.findCalendarItemsOnThisDay",
        [month, day],
        fixture.onThisDayReleases ?? []
      );
    },
  } as ReleaseRepository;

  const songRepo = {
    findCalendarVideoItemsInRanges(ranges: CalendarDateRange[]) {
      return count(
        "song.findCalendarVideoItemsInRanges",
        [ranges],
        fixture.videos ?? []
      );
    },
    findCalendarVideoItemsOnThisDay(month: number, day: number) {
      return count(
        "song.findCalendarVideoItemsOnThisDay",
        [month, day],
        fixture.onThisDayVideos ?? []
      );
    },
  } as SongRepository;

  return { calls, eventRepo, memberRepo, liveRepo, releaseRepo, songRepo };
}

function runScenario(
  repositories: CountingRepositories,
  selected: { year: number; month: number; day: number },
  today: { year: number; month: number; day: number }
) {
  return getTopPageContent(
    repositories.eventRepo,
    repositories.memberRepo,
    repositories.liveRepo,
    repositories.releaseRepo,
    repositories.songRepo,
    selected.year,
    selected.month,
    selected.day,
    today.year,
    today.month,
    today.day
  );
}

describe("getTopPageContent bounded read", () => {
  const today = { year: 2026, month: 7, day: 10 };

  it.each([
    ["today", today],
    ["selected≠today（同じ月）", { year: 2026, month: 7, day: 9 }],
    ["selected≠today（探索窓外）", { year: 2025, month: 1, day: 5 }],
  ])("%sでも単一batchの9 repository callsに固定する", async (_, selected) => {
    const repositories = makeCountingRepositories();

    const resultPromise = runScenario(repositories, selected, today);

    expect(repositories.calls).toHaveLength(9);
    expect(repositories.calls.map((call) => call.name)).toEqual([
      "event.findCalendarEventsInRanges",
      "event.findOnThisDay",
      "member.findAllBirthdays",
      "live.findCalendarPerformancesInRanges",
      "live.findCalendarPerformancesOnThisDay",
      "release.findCalendarItemsInRanges",
      "release.findCalendarItemsOnThisDay",
      "song.findCalendarVideoItemsInRanges",
      "song.findCalendarVideoItemsOnThisDay",
    ]);
    await resultPromise;
  });

  it("selected月と12か月窓をhalf-open rangeへまとめる", async () => {
    const repositories = makeCountingRepositories();

    await runScenario(
      repositories,
      { year: 2025, month: 1, day: 5 },
      today
    );

    const rangeCalls = repositories.calls.filter((call) =>
      call.name.endsWith("InRanges")
    );
    expect(rangeCalls).toHaveLength(4);
    for (const call of rangeCalls) {
      expect(call.args).toEqual([
        [
          { startDate: "2025-01-01", endDate: "2025-02-01" },
          { startDate: "2026-07-01", endDate: "2027-07-01" },
        ],
      ]);
    }
  });

  it("現行の月・日次・同日・Next Events出力を維持する", async () => {
    const eventToday = makeEvent("event-today", "2026-07-10", {
      title: "今日のカスタムイベント",
      startTime: "09:00:00",
    });
    const eventNext = makeEvent("event-next", "2026-07-11", {
      title: "次のカスタムイベント",
      startTime: "10:00:00",
    });
    const pastEvent = makeEvent("event-past", "2025-07-10", {
      title: "過去のカスタムイベント",
    });
    const birthdays: BirthdayMember[] = [
      {
        id: "member-today",
        nameJa: "今日 誕生日",
        dateOfBirth: "2000-07-10",
        groupNames: ["日向坂46"],
      },
      {
        id: "member-next",
        nameJa: "明日 誕生日",
        dateOfBirth: "2001-07-11",
        groupNames: ["乃木坂46"],
      },
    ];
    const livePerformances: LiveCalendarPerformance[] = [
      {
        id: "performance-day",
        liveId: "live-today",
        liveName: "昼夜ライブ",
        date: "2026-07-10",
        startsAt: "13:00:00",
        venueName: "会場A",
      },
      {
        id: "performance-night",
        liveId: "live-today",
        liveName: "昼夜ライブ",
        date: "2026-07-10",
        startsAt: "18:00:00",
        venueName: "会場A",
      },
      {
        id: "performance-next",
        liveId: "live-next",
        liveName: "次のライブ",
        date: "2026-07-11",
        startsAt: "12:00:00",
        venueName: "会場B",
      },
    ];
    const releases: ReleaseCalendarItem[] = [
      { releaseId: "release-today", title: "今日の新譜", date: "2026-07-10" },
      { releaseId: "release-next", title: "明日の新譜", date: "2026-07-11" },
    ];
    const videos: CalendarVideoItem[] = [
      {
        trackId: "track-today",
        trackTitle: "今日のMV",
        groupNameJa: "日向坂46",
        videoType: "mv",
        url: "https://example.com/today",
        date: "2026-07-10",
      },
      {
        trackId: "track-next",
        trackTitle: "明日のMV",
        groupNameJa: "乃木坂46",
        videoType: "mv",
        url: "https://example.com/next",
        date: "2026-07-11",
      },
    ];
    const repositories = makeCountingRepositories({
      events: [eventToday, eventNext],
      onThisDayEvents: [pastEvent, eventToday],
      birthdays,
      livePerformances,
      onThisDayLivePerformances: [
        {
          id: "performance-past",
          liveId: "live-past",
          liveName: "過去のライブ",
          date: "2024-07-10",
          startsAt: "18:00:00",
          venueName: "会場C",
        },
      ],
      releases,
      onThisDayReleases: [
        { releaseId: "release-past", title: "過去の新譜", date: "2023-07-10" },
      ],
      videos,
      onThisDayVideos: [
        {
          trackId: "track-past",
          trackTitle: "過去のMV",
          groupNameJa: "櫻坂46",
          videoType: "mv",
          url: "https://example.com/past",
          date: "2022-07-10",
        },
      ],
    });

    const result = await runScenario(repositories, today, today);

    expect(
      repositories.calls.reduce((sum, call) => sum + call.rowCount, 0)
    ).toBe(16);

    const birthdayToday = {
      type: "birthday" as const,
      memberId: "member-today",
      memberName: "今日 誕生日",
      date: "2026-07-10",
      age: 26,
      groupNames: ["日向坂46"],
    };
    const birthdayNext = {
      type: "birthday" as const,
      memberId: "member-next",
      memberName: "明日 誕生日",
      date: "2026-07-11",
      age: 25,
      groupNames: ["乃木坂46"],
    };
    const aggregatedLiveToday = {
      type: "live",
      id: "live-today:2026-07-10",
      performanceId: "performance-day",
      liveId: "live-today",
      name: "昼夜ライブ",
      date: "2026-07-10",
      startsAt: "13:00:00",
      venueName: "会場A",
      performanceCount: 2,
    } as const;
    const liveTodayDay = {
      type: "live",
      id: "performance-day",
      performanceId: "performance-day",
      liveId: "live-today",
      name: "昼夜ライブ",
      date: "2026-07-10",
      startsAt: "13:00:00",
      venueName: "会場A",
      performanceCount: 1,
    } as const;
    const liveTodayNight = {
      ...liveTodayDay,
      id: "performance-night",
      performanceId: "performance-night",
      startsAt: "18:00:00",
    } as const;
    const liveNext = {
      type: "live",
      id: "live-next:2026-07-11",
      performanceId: "performance-next",
      liveId: "live-next",
      name: "次のライブ",
      date: "2026-07-11",
      startsAt: "12:00:00",
      venueName: "会場B",
      performanceCount: 1,
    } as const;
    const releaseToday = {
      type: "release",
      id: "release-today",
      releaseId: "release-today",
      title: "今日の新譜",
      date: "2026-07-10",
    } as const;
    const releaseNext = {
      type: "release",
      id: "release-next",
      releaseId: "release-next",
      title: "明日の新譜",
      date: "2026-07-11",
    } as const;
    const videoToday = {
      type: "video",
      id: "track-today:mv",
      trackId: "track-today",
      trackTitle: "今日のMV",
      videoLabel: "MV",
      url: "https://example.com/today",
      date: "2026-07-10",
    } as const;
    const videoNext = {
      type: "video",
      id: "track-next:mv",
      trackId: "track-next",
      trackTitle: "明日のMV",
      videoLabel: "MV",
      url: "https://example.com/next",
      date: "2026-07-11",
    } as const;

    expect(result).toEqual({
      monthEvents: [
        { ...eventToday, type: "event" },
        birthdayToday,
        aggregatedLiveToday,
        releaseToday,
        videoToday,
        { ...eventNext, type: "event" },
        birthdayNext,
        liveNext,
        releaseNext,
        videoNext,
      ],
      selectedDateEvents: [
        birthdayToday,
        releaseToday,
        videoToday,
        { ...eventToday, type: "event" },
        liveTodayDay,
        liveTodayNight,
      ],
      onThisDayEvents: [
        { ...pastEvent, type: "event" },
        {
          type: "live",
          id: "performance-past",
          performanceId: "performance-past",
          liveId: "live-past",
          name: "過去のライブ",
          date: "2024-07-10",
          startsAt: "18:00:00",
          venueName: "会場C",
          performanceCount: 1,
        },
        {
          type: "release",
          id: "release-past",
          releaseId: "release-past",
          title: "過去の新譜",
          date: "2023-07-10",
        },
        {
          type: "video",
          id: "track-past:mv",
          trackId: "track-past",
          trackTitle: "過去のMV",
          videoLabel: "MV",
          url: "https://example.com/past",
          date: "2022-07-10",
        },
      ],
      todayEvents: [
        birthdayToday,
        releaseToday,
        videoToday,
        { ...eventToday, type: "event" },
        liveTodayDay,
        liveTodayNight,
      ],
      nextEvents: [
        birthdayNext,
        releaseNext,
        videoNext,
        { ...eventNext, type: "event" },
        // #400 追補2: NEXT_EVENTS_LIMIT を 4→6 に増やしたため、従来 slice(0,4) で
        // 切られていた次の公演も候補全件に含まれる（並び順は日付昇順 + 同日規則）。
        // Next Events は公演単位（raw performance）のため id は performanceId 側になり、
        // monthEvents で使う集約形 liveNext（id=liveId:date）とは id だけ異なる。
        { ...liveNext, id: "performance-next" },
      ],
    });
  });

  it("todayと12か月窓終端をNext Eventsから除外する", async () => {
    const repositories = makeCountingRepositories({
      releases: [
        { releaseId: "today", title: "今日", date: "2026-07-10" },
        { releaseId: "inside", title: "窓内", date: "2027-06-30" },
        { releaseId: "end", title: "窓終端", date: "2027-07-01" },
      ],
    });

    const result = await runScenario(repositories, today, today);

    expect(
      result.nextEvents.map((event) =>
        event.type === "release" ? event.id : null
      )
    ).toEqual(["inside"]);
  });
});
