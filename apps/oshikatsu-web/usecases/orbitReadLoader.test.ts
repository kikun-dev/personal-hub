// #382: orbitReadLoader.ts の shared read cache 基盤（createSharedReadLoader /
// withOrbitReadClient）単体の契約テスト。
//
// `canUseSharedReadCache` は `isReadOnlyServerClientAvailable()` をモジュールロード時に
// 一度だけ評価する定数のため、enabled/disabled を切り替えるテストは
// `vi.resetModules()` → 環境状態の設定 → `await import(...)` の順で
// 対象モジュールを毎回作り直す必要がある。
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FakeNextCache } from "@/usecases/testing/fakeSharedCache";
import { createFakeNextCache } from "@/usecases/testing/fakeSharedCache";

// vi.mock は ファイル先頭へ hoist されるため、ファクトリ内から参照する可変状態は
// vi.hoisted 経由で用意する（isReadOnlyServerClientAvailable の返り値の切り替え、
// read-only / session 各clientの識別用marker）。
const envState = vi.hoisted(() => ({ available: true }));
const readOnlyClientMarker = vi.hoisted(() => ({ kind: "read-only-client" as const }));
const sessionClientMarker = vi.hoisted(() => ({ kind: "session-client" as const }));

vi.mock("next/cache", () => {
  // このfactoryはファイル内で一度だけ実行され、vi.resetModules()では再実行されない
  // （resetModulesは実モジュールの再評価のみを保証する）。そのため fake cache
  // instanceはテストファイル全体で共有される単一インスタンスであり、テスト間の
  // 独立性は各テストが明示的に呼ぶ `cache.reset()` で担保する。
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

async function importFakeNextCache(): Promise<FakeNextCache> {
  const mod = (await import("next/cache")) as unknown as {
    __fakeCache: FakeNextCache;
  };
  return mod.__fakeCache;
}

// 前テストのregistry/storeを引き継がないよう、resetModules直後に呼ぶ。
async function resetFakeCache(): Promise<FakeNextCache> {
  const fakeCache = await importFakeNextCache();
  fakeCache.reset();
  return fakeCache;
}

describe("orbitReadLoader", () => {
  beforeEach(() => {
    envState.available = true;
  });

  describe("createSharedReadLoader（enabled: service role key あり）", () => {
    it("fakeのunstable_cacheへkeyParts/tagsを渡してwrapし、同一引数の2回目はloaderを再実行しない", async () => {
      envState.available = true;
      vi.resetModules();
      const fakeCache = await resetFakeCache();
      const { createSharedReadLoader } = await import(
        "@/usecases/orbitReadLoader"
      );

      let callCount = 0;
      const loader = createSharedReadLoader(
        ["test", "shared-loader"],
        ["test:tag"],
        async (x: number) => {
          callCount += 1;
          return x * 2;
        }
      );

      expect(fakeCache.getRegistry()).toEqual([
        { keyParts: ["test", "shared-loader"], tags: ["test:tag"] },
      ]);

      const first = await loader(3);
      expect(first).toBe(6);
      expect(callCount).toBe(1);

      const second = await loader(3);
      expect(second).toBe(6);
      // 同一引数の2回目はcache hitのためloaderを再実行しない
      expect(callCount).toBe(1);
    });
  });

  describe("createSharedReadLoader（disabled: service role key なし）", () => {
    it("渡したloaderをそのまま返し（素通し）、unstable_cacheは呼ばれない", async () => {
      envState.available = false;
      vi.resetModules();
      const fakeCache = await resetFakeCache();
      const { createSharedReadLoader } = await import(
        "@/usecases/orbitReadLoader"
      );

      const rawLoader = async (x: number) => x + 1;
      const wrapped = createSharedReadLoader(
        ["test", "shared-loader"],
        ["test:tag"],
        rawLoader
      );

      // disabled時は同一参照（素通し）。unstable_cacheに登録されないためregistryは空。
      expect(wrapped).toBe(rawLoader);
      expect(fakeCache.getRegistry()).toEqual([]);
    });
  });

  describe("withOrbitReadClient", () => {
    it("enabled時はread-only clientのmarkerをloaderへ渡す", async () => {
      envState.available = true;
      vi.resetModules();
      await resetFakeCache();
      const { withOrbitReadClient } = await import(
        "@/usecases/orbitReadLoader"
      );

      const received = await withOrbitReadClient(async (supabase) => supabase);
      expect(received).toBe(readOnlyClientMarker);
    });

    it("disabled時はセッション付きclientのmarkerをloaderへ渡す", async () => {
      envState.available = false;
      vi.resetModules();
      await resetFakeCache();
      const { withOrbitReadClient } = await import(
        "@/usecases/orbitReadLoader"
      );

      const received = await withOrbitReadClient(async (supabase) => supabase);
      expect(received).toBe(sessionClientMarker);
    });
  });
});
