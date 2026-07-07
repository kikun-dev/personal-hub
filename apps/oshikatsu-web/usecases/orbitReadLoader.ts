// Orbit 閲覧導線の shared read cache 基盤（ADR 0006）。
// `SUPABASE_SERVICE_ROLE_KEY` がある環境では read-only client + unstable_cache で
// ドメイン横断の共有キャッシュを構成し、無い環境ではセッション付き client に
// フォールバックして機能を維持する。各ドメインの read ファイル
// （readOrbitMusicData / readOrbitLiveData / readOrbitSpotData）はここから
// `withOrbitReadClient` / `createSharedReadLoader` を利用する。
import { unstable_cache } from "next/cache";
import { createClient } from "@personal-hub/supabase/server";
import {
  createReadOnlyClient,
  isReadOnlyServerClientAvailable,
} from "@personal-hub/supabase/read-only-server";
import type { OrbitReadClient } from "@/types/orbitReadClient";

export const canUseSharedReadCache = isReadOnlyServerClientAvailable();

export async function withOrbitReadClient<T>(
  loader: (supabase: OrbitReadClient) => Promise<T>
): Promise<T> {
  if (canUseSharedReadCache) {
    return loader(createReadOnlyClient());
  }

  const supabase = await createClient();
  return loader(supabase);
}

export function createSharedReadLoader<TArgs extends unknown[], TResult>(
  keyParts: string[],
  tags: string[],
  loader: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  if (!canUseSharedReadCache) {
    return loader;
  }

  return unstable_cache(loader, keyParts, { tags });
}
