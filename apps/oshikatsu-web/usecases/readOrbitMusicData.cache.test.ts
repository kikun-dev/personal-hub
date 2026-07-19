// #382: Top Page shared cache（readOrbitMusicData.ts の getTopPageData /
// loadTopPageData）の hit・key・invalidation・fallback・personal非混入 contract テスト。
//
// getTopPageContent.test.ts は repository stub を直接注入する経路のみを検証し、
// createSharedReadLoader / unstable_cache を通らない。ここでは `next/cache` と
// repository factory を差し替え、shared read cache の実経路（orbitReadLoader.ts）を
// 通した契約を固定する。
//
// `canUseSharedReadCache`（orbitReadLoader.ts）はモジュールロード時評価のため、
// enabled/disabled を切り替えるテストは毎回 `vi.resetModules()` → 環境状態設定 →
// `await import("@/usecases/readOrbitMusicData")` の順で対象モジュールを作り直す。
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FakeNextCache } from "@/usecases/testing/fakeSharedCache";
import { createFakeNextCache } from "@/usecases/testing/fakeSharedCache";

const envState = vi.hoisted(() => ({ available: true }));
const readOnlyClientMarker = vi.hoisted(() => ({ kind: "read-only-client" as const }));
const sessionClientMarker = vi.hoisted(() => ({ kind: "session-client" as const }));

// repository stub が記録する呼び出しログ。`vi.mock` の factory はモジュールが
// 最初に解決されたときの一度きりで実行され、`vi.resetModules()` では
// 再実行されない（resetModulesは実モジュールの再評価のみを保証する）ため、
// この配列はテストファイル全体で共有される。各テスト冒頭で明示的に空配列へ戻す。
type RepositoryCallLog = {
  name: string;
  args: unknown[];
  client: unknown;
};

const repoState = vi.hoisted(() => ({
  calls: [] as RepositoryCallLog[],
}));

function recordCall(name: string, args: unknown[], client: unknown): void {
  repoState.calls.push({ name, args, client });
}

vi.mock("next/cache", () => {
  // このfactoryはファイル内で一度だけ実行され、vi.resetModules()では再実行されない。
  // fake cache instanceはテストファイル全体で共有される単一インスタンスであり、
  // テスト間の独立性は各テストが明示的に呼ぶ resetFakeCache() で担保する。
  const cache = createFakeNextCache();
  return {
    unstable_cache: cache.unstable_cache,
    updateTag: cache.updateTag,
    revalidateTag: cache.revalidateTag,
    __fakeCache: cache,
  };
});

vi.mock("@personal-hub/supabase/read-only-server", () => ({
  isReadOnlyServerClientAvailable: () => envState.available,
  createReadOnlyClient: () => readOnlyClientMarker,
}));

vi.mock("@personal-hub/supabase/server", () => ({
  createClient: async () => sessionClientMarker,
}));

// getTopPageContent が呼ぶメソッドのみ実装した計数stub（getTopPageContent.test.ts の
// パターンに合わせる）。フィクスチャは全て空配列で統一する: これにより
// TopPageContent の返り値は選択日・今日に関わらず常に
// { monthEvents: [], selectedDateEvents: [], onThisDayEvents: [], todayEvents: [],
//   nextEvents: [] } となり、cache hit/missの結果比較を引数非依存で固定できる。
vi.mock("@/repositories/eventRepository", () => ({
  createEventRepository: (supabase: unknown) => ({
    findCalendarEventsInRanges: (ranges: unknown) => {
      recordCall("event.findCalendarEventsInRanges", [ranges], supabase);
      return Promise.resolve([]);
    },
    findOnThisDay: (month: number, day: number) => {
      recordCall("event.findOnThisDay", [month, day], supabase);
      return Promise.resolve([]);
    },
  }),
}));

vi.mock("@/repositories/memberRepository", () => ({
  createMemberRepository: (supabase: unknown) => ({
    findAllBirthdays: () => {
      recordCall("member.findAllBirthdays", [], supabase);
      return Promise.resolve([]);
    },
  }),
}));

vi.mock("@/repositories/liveRepository", () => ({
  createLiveRepository: (supabase: unknown) => ({
    findCalendarPerformancesInRanges: (ranges: unknown) => {
      recordCall("live.findCalendarPerformancesInRanges", [ranges], supabase);
      return Promise.resolve([]);
    },
    findCalendarPerformancesOnThisDay: (month: number, day: number) => {
      recordCall(
        "live.findCalendarPerformancesOnThisDay",
        [month, day],
        supabase
      );
      return Promise.resolve([]);
    },
  }),
}));

vi.mock("@/repositories/releaseRepository", () => ({
  createReleaseRepository: (supabase: unknown) => ({
    findCalendarItemsInRanges: (ranges: unknown) => {
      recordCall("release.findCalendarItemsInRanges", [ranges], supabase);
      return Promise.resolve([]);
    },
    findCalendarItemsOnThisDay: (month: number, day: number) => {
      recordCall("release.findCalendarItemsOnThisDay", [month, day], supabase);
      return Promise.resolve([]);
    },
  }),
}));

vi.mock("@/repositories/songRepository", () => ({
  createSongRepository: (supabase: unknown) => ({
    findCalendarVideoItemsInRanges: (ranges: unknown) => {
      recordCall("song.findCalendarVideoItemsInRanges", [ranges], supabase);
      return Promise.resolve([]);
    },
    findCalendarVideoItemsOnThisDay: (month: number, day: number) => {
      recordCall(
        "song.findCalendarVideoItemsOnThisDay",
        [month, day],
        supabase
      );
      return Promise.resolve([]);
    },
  }),
}));

// top-page loaderからは呼ばれないが、readOrbitMusicData.ts が
// 他ページloader（members/songs/releases）用に import するため差し替えが必要。
vi.mock("@/repositories/groupRepository", () => ({
  createGroupRepository: () => ({
    findAll: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
  }),
}));

const EMPTY_TOP_PAGE_CONTENT = {
  monthEvents: [],
  selectedDateEvents: [],
  onThisDayEvents: [],
  todayEvents: [],
  nextEvents: [],
};

async function importFakeNextCache(): Promise<FakeNextCache> {
  const mod = (await import("next/cache")) as unknown as {
    __fakeCache: FakeNextCache;
  };
  return mod.__fakeCache;
}

// 前テストのregistry/storeを引き継がないよう、resetModules直後・対象usecase
// importより前に呼ぶ。
async function resetFakeCache(): Promise<FakeNextCache> {
  const fakeCache = await importFakeNextCache();
  fakeCache.reset();
  return fakeCache;
}

describe("readOrbitMusicData shared cache contract（getTopPageData）", () => {
  beforeEach(() => {
    envState.available = true;
    repoState.calls.length = 0;
  });

  it("[hit] 同一引数の2回目はrepository callを増やさず、結果はdeep equalになる", async () => {
    envState.available = true;
    vi.resetModules();
    await resetFakeCache();
    repoState.calls.length = 0;
    const { getTopPageData } = await import("@/usecases/readOrbitMusicData");

    const args = [2026, 7, 19, 2026, 7, 19] as const;
    const first = await getTopPageData(...args);
    const callsAfterFirst = repoState.calls.length;
    // getTopPageContent.test.ts が固定する契約と同じ: 単一batchの9 repository calls
    expect(callsAfterFirst).toBe(9);
    expect(first).toEqual(EMPTY_TOP_PAGE_CONTENT);

    const second = await getTopPageData(...args);
    expect(repoState.calls.length).toBe(callsAfterFirst);
    expect(second).toEqual(first);
  });

  it("[key分離] todayとselected dateが異なる引数は別entryとしてそれぞれloaderを実行する", async () => {
    envState.available = true;
    vi.resetModules();
    const fakeCache = await resetFakeCache();
    repoState.calls.length = 0;
    const { getTopPageData } = await import("@/usecases/readOrbitMusicData");

    await getTopPageData(2026, 7, 19, 2026, 7, 19);
    await getTopPageData(2026, 7, 10, 2026, 7, 19);

    expect(repoState.calls.length).toBe(18);
    const topPageKeys = fakeCache
      .getStoreKeys()
      .filter((key) => key.includes("top-page-data"));
    expect(topPageKeys).toHaveLength(2);
  });

  it("[key分離] 同月内でも選択日が異なれば別entryとして分離する", async () => {
    envState.available = true;
    vi.resetModules();
    const fakeCache = await resetFakeCache();
    repoState.calls.length = 0;
    const { getTopPageData } = await import("@/usecases/readOrbitMusicData");

    await getTopPageData(2026, 7, 10, 2026, 7, 19);
    await getTopPageData(2026, 7, 11, 2026, 7, 19);

    expect(repoState.calls.length).toBe(18);
    const topPageKeys = fakeCache
      .getStoreKeys()
      .filter((key) => key.includes("top-page-data"));
    expect(topPageKeys).toHaveLength(2);
  });

  it("[key contract] keyPartsはv2で固定され、引数順序がkey生成に反映される", async () => {
    envState.available = true;
    vi.resetModules();
    const fakeCache = await resetFakeCache();
    repoState.calls.length = 0;
    const { getTopPageData } = await import("@/usecases/readOrbitMusicData");
    const { ORBIT_CACHE_TAGS } = await import("@/lib/cacheTags");

    await getTopPageData(2026, 7, 19, 2026, 7, 10);

    // v2: #346 でDTOの形（performanceId追加）が変わった際にschema versionをbumpした
    // 契約（readOrbitMusicData.ts のコメント参照）。version segmentを落とす変更や
    // 引数順を変える変更でこのassertがfailするように、keyPartsをexact assertする。
    const topPageLoader = fakeCache
      .getRegistry()
      .find((entry) => entry.keyParts[1] === "top-page-data");
    expect(topPageLoader?.keyParts).toEqual(["orbit", "top-page-data", "v2"]);
    expect(topPageLoader?.tags).toEqual([
      ORBIT_CACHE_TAGS.top,
      ORBIT_CACHE_TAGS.lives,
      ORBIT_CACHE_TAGS.releases,
      ORBIT_CACHE_TAGS.songs,
    ]);

    // 実際に渡した引数順（year, month, day, todayYear, todayMonth, todayDay）と
    // 一致するargsではentryが見つかり、today/selectedを入れ替えた別順のargsは
    // 別entry（未登録）になることで、引数順がkey生成へ反映されることを固定する。
    expect(
      fakeCache.getEntry(
        ["orbit", "top-page-data", "v2"],
        [2026, 7, 19, 2026, 7, 10]
      )
    ).toBeDefined();
    expect(
      fakeCache.getEntry(
        ["orbit", "top-page-data", "v2"],
        [2026, 7, 10, 2026, 7, 19]
      )
    ).toBeUndefined();
  });

  it("[version bump] keyPartsのversionが異なればstale payloadを再利用せずloaderを実行する", async () => {
    envState.available = true;
    vi.resetModules();
    const fakeCache = await resetFakeCache();
    repoState.calls.length = 0;

    const stalePayload = {
      monthEvents: ["stale-v1-payload"],
      selectedDateEvents: [],
      onThisDayEvents: [],
      todayEvents: [],
      nextEvents: [],
    };
    // v2稼働前の(架空の)v1 keyへstale payloadを事前投入する。
    fakeCache.seed(
      ["orbit", "top-page-data", "v1"],
      [2026, 7, 19, 2026, 7, 19],
      stalePayload,
      []
    );

    const { getTopPageData } = await import("@/usecases/readOrbitMusicData");
    const result = await getTopPageData(2026, 7, 19, 2026, 7, 19);

    expect(result).not.toEqual(stalePayload);
    expect(result).toEqual(EMPTY_TOP_PAGE_CONTENT);
    // v2 keyはstale entryと別物のためloaderが実際に実行される
    expect(repoState.calls.length).toBe(9);
  });

  describe("[tag invalidation] warm状態からentityを更新すると同一引数呼び出しでloaderが再実行される", () => {
    it.each([
      // member = birthday（誕生日）の失効経路を代表
      ["member", "revalidateOrbitMemberData"],
      ["event", "revalidateOrbitEventData"],
      ["live", "revalidateOrbitLiveData"],
      ["release", "revalidateOrbitReleaseData"],
      // song = MV/動画の失効経路を代表
      ["song", "revalidateOrbitSongData"],
    ] as const)(
      "%sの更新relatedはtop-page loaderを再実行させる",
      async (_entity, revalidateFnName) => {
        envState.available = true;
        vi.resetModules();
        await resetFakeCache();
        repoState.calls.length = 0;
        const { getTopPageData } = await import(
          "@/usecases/readOrbitMusicData"
        );
        // revalidateOrbit.ts も同じ vi.mock("next/cache") を共有するため、
        // 同一テスト内・同一resetModules epochでdynamic importする。
        // 関数名はit.eachのas constでexport名のliteral unionになっており、
        // renameすればここがコンパイルエラーになる。
        const revalidateModule = await import("@/lib/revalidateOrbit");

        const args = [2026, 7, 19, 2026, 7, 19] as const;
        await getTopPageData(...args);
        const callsAfterWarm = repoState.calls.length;
        expect(callsAfterWarm).toBe(9);

        revalidateModule[revalidateFnName]();

        await getTopPageData(...args);
        // invalidation後の同一引数呼び出しはcache hitできずloaderが再実行される
        expect(repoState.calls.length).toBe(callsAfterWarm * 2);
      }
    );
  });

  it("[fallback] service key無しでは同一引数でも毎回loaderを実行し、bounded readとsession clientを維持する", async () => {
    envState.available = false;
    vi.resetModules();
    const fakeCache = await resetFakeCache();
    repoState.calls.length = 0;
    const { getTopPageData } = await import("@/usecases/readOrbitMusicData");

    const args = [2026, 7, 19, 2026, 7, 19] as const;
    const first = await getTopPageData(...args);
    expect(repoState.calls.length).toBe(9);

    const second = await getTopPageData(...args);
    // disabled時は毎回loaderが実行されるため呼び出し回数は1回分の2倍
    expect(repoState.calls.length).toBe(18);
    expect(second).toEqual(first);

    // disabled時はunstable_cacheへ登録されない（素通し）
    expect(fakeCache.getRegistry()).toEqual([]);
    // 各実行のrepository callはセッション付きclient（read-only clientではない）を使う
    expect(
      repoState.calls.every((call) => call.client === sessionClientMarker)
    ).toBe(true);
  });

  // #382 必須検証(8): 本来はreadOrbitLiveData / readOrbitSpotData / readOrbitWikiData /
  // readOrbitAdminDataも合わせてimportし、registry全体でpersonal非混入を検証する設計
  // だった。だがreadOrbitAdminData.ts はeventType/person/spot/venue/wiki repositoryと
  // getEventTypes等の追加usecase importを要し、本テストの目的（top-page loaderの
  // personal非混入）に対してmock setupが過剰になるため、readOrbitMusicDataの
  // registry + top-page payload検証に絞る。
  it("[personal非混入] readOrbitMusicDataのkey/tagとtop-page payloadにattendance/mypage/user系が混入しない", async () => {
    envState.available = true;
    vi.resetModules();
    const fakeCache = await resetFakeCache();
    repoState.calls.length = 0;
    const { getTopPageData } = await import("@/usecases/readOrbitMusicData");

    const result = await getTopPageData(2026, 7, 19, 2026, 7, 19);

    const forbiddenPattern = /attendance|mypage|user/i;
    // readOrbitMusicData.ts import時に定義される全loader（top/members/member-detail/
    // songs/song-detail/releases/release-detail）がregistryに載るため、top-page loader
    // 以外の他ページloaderのkey/tagにも同じ非混入契約を課せる。
    for (const entry of fakeCache.getRegistry()) {
      for (const part of entry.keyParts) {
        expect(part).not.toMatch(forbiddenPattern);
      }
      for (const tag of entry.tags) {
        expect(tag).not.toMatch(forbiddenPattern);
      }
    }

    // top-page payloadのトップレベル構造はglobalデータのみ
    // （monthEvents/selectedDateEvents/onThisDayEvents/todayEvents/nextEvents）で、
    // attendance系キーを含まない。
    expect(Object.keys(result).sort()).toEqual(
      [
        "monthEvents",
        "nextEvents",
        "onThisDayEvents",
        "selectedDateEvents",
        "todayEvents",
      ].sort()
    );
    for (const key of Object.keys(result)) {
      expect(key).not.toMatch(forbiddenPattern);
    }
  });
});
