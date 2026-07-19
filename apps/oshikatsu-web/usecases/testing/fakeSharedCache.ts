// #382: `next/cache` の公開契約（unstable_cache / updateTag / revalidateTag）を
// in-memory で再現するテスト用 fake。orbitReadLoader.test.ts /
// readOrbitMusicData.cache.test.ts から `vi.mock("next/cache", ...)` の実体として使う。
// ファイル名が `*.test.ts` に一致しないため vitest の収集対象にはならない。
//
// key 生成は「keyParts と引数リストの両方が同一のとき同一 key」という契約を
// 満たせばよく、Next 内部のキー形式を複製する必要はない。

export type FakeCacheEntry = {
  value: unknown;
  tags: string[];
};

export type RegisteredLoader = {
  keyParts: string[];
  tags: string[];
};

export type FakeNextCache = {
  unstable_cache: <TArgs extends unknown[], TResult>(
    loader: (...args: TArgs) => Promise<TResult>,
    keyParts: string[],
    options: { tags: string[] }
  ) => (...args: TArgs) => Promise<TResult>;
  updateTag: (tag: string) => void;
  revalidateTag: (tag: string) => void;
  seed: (
    keyParts: string[],
    args: unknown[],
    value: unknown,
    tags: string[]
  ) => void;
  getRegistry: () => RegisteredLoader[];
  getStoreKeys: () => string[];
  getEntry: (keyParts: string[], args: unknown[]) => FakeCacheEntry | undefined;
  // `vi.mock("next/cache", factory)` の factory はモジュールが最初に解決された
  // ときの一度きりで実行され、`vi.resetModules()` では再実行されない
  // （resetModulesは実モジュールの再評価のみを保証し、mock factoryの結果は
  // テストファイル内で使い回される）。そのため store/registry を明示的に空へ
  // 戻す reset をテスト側から毎回呼ぶ必要がある。
  reset: () => void;
};

function buildKey(keyParts: string[], args: unknown[]): string {
  return JSON.stringify([keyParts, args]);
}

export function createFakeNextCache(): FakeNextCache {
  const store = new Map<string, FakeCacheEntry>();
  const registry: RegisteredLoader[] = [];

  function unstable_cache<TArgs extends unknown[], TResult>(
    loader: (...args: TArgs) => Promise<TResult>,
    keyParts: string[],
    options: { tags: string[] }
  ): (...args: TArgs) => Promise<TResult> {
    // 呼び出し側（createSharedReadLoader）が keyParts / tags をどう渡したかを
    // registry に記録する。契約テストはここを検証して key/tag の取り違えを検知する。
    registry.push({ keyParts: [...keyParts], tags: [...options.tags] });

    return async (...args: TArgs): Promise<TResult> => {
      const key = buildKey(keyParts, args);
      const cached = store.get(key);
      if (cached) {
        return cached.value as TResult;
      }

      const value = await loader(...args);
      store.set(key, { value, tags: [...options.tags] });
      return value;
    };
  }

  function updateTag(tag: string): void {
    for (const [key, entry] of store.entries()) {
      if (entry.tags.includes(tag)) {
        store.delete(key);
      }
    }
  }

  function seed(
    keyParts: string[],
    args: unknown[],
    value: unknown,
    tags: string[]
  ): void {
    store.set(buildKey(keyParts, args), { value, tags: [...tags] });
  }

  return {
    unstable_cache,
    updateTag,
    // next/cache の revalidateTag は updateTag と同じタグ失効契約を持つため、
    // fake でも同一実装を指す（本プロジェクトの呼び出し元は updateTag のみ使用）。
    revalidateTag: updateTag,
    seed,
    getRegistry: () => registry.map((entry) => ({ ...entry, keyParts: [...entry.keyParts], tags: [...entry.tags] })),
    getStoreKeys: () => Array.from(store.keys()),
    getEntry: (keyParts, args) => store.get(buildKey(keyParts, args)),
    reset: () => {
      store.clear();
      registry.length = 0;
    },
  };
}
