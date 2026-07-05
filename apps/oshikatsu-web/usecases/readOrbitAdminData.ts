import { unstable_cache } from "next/cache";
import { createClient } from "@personal-hub/supabase/server";
import {
  createReadOnlyClient,
  isReadOnlyServerClientAvailable,
} from "@personal-hub/supabase/read-only-server";
import type { OrbitReadClient } from "@/types/orbitReadClient";
import { ORBIT_CACHE_TAGS } from "@/lib/cacheTags";
import { createEventRepository } from "@/repositories/eventRepository";
import { createEventTypeRepository } from "@/repositories/eventTypeRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createLiveRepository } from "@/repositories/liveRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createPersonRepository } from "@/repositories/personRepository";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createSongRepository } from "@/repositories/songRepository";
import { createSpotRepository } from "@/repositories/spotRepository";
import { createVenueRepository } from "@/repositories/venueRepository";
import { getEventTypes } from "@/usecases/getEventTypes";
import { getGroups } from "@/usecases/getGroups";
import { listMemberOptions } from "@/usecases/listMemberOptions";
import { listPersonOptions } from "@/usecases/listPersonOptions";
import { listReleaseOptions } from "@/usecases/listReleaseOptions";
import { listSongOptions } from "@/usecases/listSongOptions";

const canUseSharedReadCache = isReadOnlyServerClientAvailable();

async function withOrbitReadClient<T>(
  loader: (supabase: OrbitReadClient) => Promise<T>
): Promise<T> {
  if (canUseSharedReadCache) {
    return loader(createReadOnlyClient());
  }

  const supabase = await createClient();
  return loader(supabase);
}

function createSharedReadLoader<TArgs extends unknown[], TResult>(
  keyParts: string[],
  tags: string[],
  loader: (...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  if (!canUseSharedReadCache) {
    return loader;
  }

  return unstable_cache(loader, keyParts, { tags });
}

const loadMemberFormMasterData = createSharedReadLoader(
  ["orbit", "admin", "member-form-masters"],
  [ORBIT_CACHE_TAGS.groups],
  async () =>
    withOrbitReadClient(async (supabase) => {
      return {
        groups: await getGroups(createGroupRepository(supabase)),
      };
    })
);

const loadEventFormMasterData = createSharedReadLoader(
  ["orbit", "admin", "event-form-masters"],
  [
    ORBIT_CACHE_TAGS.eventTypes,
    ORBIT_CACHE_TAGS.groups,
    ORBIT_CACHE_TAGS.members,
  ],
  async () =>
    withOrbitReadClient(async (supabase) => {
      const [eventTypes, groups, members] = await Promise.all([
        getEventTypes(createEventTypeRepository(supabase)),
        getGroups(createGroupRepository(supabase)),
        listMemberOptions(createMemberRepository(supabase)),
      ]);

      return {
        eventTypes,
        groups,
        members,
      };
    })
);

const loadSongFormMasterData = createSharedReadLoader(
  ["orbit", "admin", "song-form-masters"],
  [
    ORBIT_CACHE_TAGS.groups,
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.people,
    ORBIT_CACHE_TAGS.releases,
  ],
  async () =>
    withOrbitReadClient(async (supabase) => {
      const [groups, members, people, releases] = await Promise.all([
        // 楽曲フォームはグループ選択肢に「その他」を含める（#264）
        getGroups(createGroupRepository(supabase), { includeCatchall: true }),
        listMemberOptions(createMemberRepository(supabase)),
        listPersonOptions(createPersonRepository(supabase)),
        listReleaseOptions(createReleaseRepository(supabase)),
      ]);

      return {
        groups,
        members,
        people,
        releases,
      };
    })
);

const loadReleaseFormMasterData = createSharedReadLoader(
  ["orbit", "admin", "release-form-masters"],
  [
    ORBIT_CACHE_TAGS.groups,
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.people,
    ORBIT_CACHE_TAGS.songOptions,
  ],
  async () =>
    withOrbitReadClient(async (supabase) => {
      const [groups, members, people, songOptions] = await Promise.all([
        getGroups(createGroupRepository(supabase)),
        listMemberOptions(createMemberRepository(supabase)),
        listPersonOptions(createPersonRepository(supabase)),
        listSongOptions(createSongRepository(supabase)),
      ]);

      return {
        groups,
        members,
        people,
        songOptions,
      };
    })
);

export async function getMemberFormMasterData() {
  return loadMemberFormMasterData();
}

export async function getEventFormMasterData() {
  return loadEventFormMasterData();
}

export async function getSongFormMasterData() {
  return loadSongFormMasterData();
}

export async function getReleaseFormMasterData() {
  return loadReleaseFormMasterData();
}

const loadLiveFormMasterData = createSharedReadLoader(
  ["orbit", "admin", "live-form-masters"],
  [
    ORBIT_CACHE_TAGS.groups,
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.venues,
    ORBIT_CACHE_TAGS.songOptions,
  ],
  async () =>
    withOrbitReadClient(async (supabase) => {
      const [groups, members, venues, songOptions] = await Promise.all([
        getGroups(createGroupRepository(supabase)),
        listMemberOptions(createMemberRepository(supabase)),
        createVenueRepository(supabase).findOptions(),
        listSongOptions(createSongRepository(supabase)),
      ]);

      return {
        groups,
        members,
        venues,
        songOptions,
      };
    })
);

export async function getLiveFormMasterData() {
  return loadLiveFormMasterData();
}

// スポットフォーム用マスタデータ（Issue #286）。他フォームと異なり
// createSharedReadLoader（shared cache）には載せない。イベント・関連動画の
// オプション（findOptions / findVideoOptions）に対応する revalidate タグが
// まだ整備されていない（イベント・楽曲動画の作成/更新時にキャッシュを
// 失効させていない）ため、shared cache に載せると古い候補一覧が
// 表示され続ける恐れがある。整備されるまでは都度取得にとどめる。
export async function getSpotFormMasterData() {
  return withOrbitReadClient(async (supabase) => {
    const [groups, members, songOptions, liveOptions, eventOptions, videoOptions, subtypeOptions] =
      await Promise.all([
        getGroups(createGroupRepository(supabase)),
        listMemberOptions(createMemberRepository(supabase)),
        listSongOptions(createSongRepository(supabase)),
        createLiveRepository(supabase).findOptions(),
        createEventRepository(supabase).findOptions(),
        createSongRepository(supabase).findVideoOptions(),
        createSpotRepository(supabase).findSubtypeOptions(),
      ]);

    return {
      groups,
      members,
      songOptions,
      liveOptions,
      eventOptions,
      videoOptions,
      subtypeOptions,
    };
  });
}
