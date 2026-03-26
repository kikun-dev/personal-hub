import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@personal-hub/supabase";
import { createClient } from "@personal-hub/supabase/server";
import {
  createReadOnlyClient,
  isReadOnlyServerClientAvailable,
} from "@personal-hub/supabase/read-only-server";
import { ORBIT_CACHE_TAGS } from "@/lib/cacheTags";
import { createEventRepository } from "@/repositories/eventRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createSongRepository } from "@/repositories/songRepository";
import { getGroups } from "@/usecases/getGroups";
import { getMember } from "@/usecases/getMember";
import { getRelease } from "@/usecases/getRelease";
import { getSong } from "@/usecases/getSong";
import { getTopPageContent } from "@/usecases/getTopPageContent";
import { listPublicMembers } from "@/usecases/listPublicMembers";
import { listPublicReleases } from "@/usecases/listPublicReleases";
import { listPublicSongs } from "@/usecases/listPublicSongs";
import type { MemberFilters as MemberFiltersType } from "@/types/member";
import type { ReleaseFilters as ReleaseFiltersType } from "@/types/release";
import type { SongFilters as SongFiltersType } from "@/types/song";

const canUseSharedReadCache = isReadOnlyServerClientAvailable();

async function withOrbitReadClient<T>(
  loader: (supabase: SupabaseClient) => Promise<T>
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

const loadTopPageData = createSharedReadLoader(
  ["orbit", "top-page-data"],
  [ORBIT_CACHE_TAGS.top],
  async (year: number, month: number, day: number) =>
    withOrbitReadClient(async (supabase) => {
      return getTopPageContent(
        createEventRepository(supabase),
        createMemberRepository(supabase),
        year,
        month,
        day
      );
    })
);

const loadMembersPageData = createSharedReadLoader(
  ["orbit", "members-page-data"],
  [
    ORBIT_CACHE_TAGS.groups,
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.membersList,
  ],
  async (
    groupId?: string,
    status: MemberFiltersType["status"] = "active",
    generation?: string
  ) =>
    withOrbitReadClient(async (supabase) => {
      const filters: MemberFiltersType = {
        generation,
        groupId,
        status,
      };

      const [members, groups] = await Promise.all([
        listPublicMembers(createMemberRepository(supabase), filters),
        getGroups(createGroupRepository(supabase)),
      ]);

      return {
        groups,
        members,
      };
    })
);

const loadMemberDetailPageData = createSharedReadLoader(
  ["orbit", "member-detail-page-data"],
  [
    ORBIT_CACHE_TAGS.groups,
    ORBIT_CACHE_TAGS.members,
    ORBIT_CACHE_TAGS.membersDetail,
    ORBIT_CACHE_TAGS.songs,
  ],
  async (id: string) =>
    withOrbitReadClient(async (supabase) => {
      const memberRepo = createMemberRepository(supabase);
      const groupRepo = createGroupRepository(supabase);
      const eventRepo = createEventRepository(supabase);
      const songRepo = createSongRepository(supabase);

      const [member, groups] = await Promise.all([
        getMember(memberRepo, id),
        getGroups(groupRepo),
      ]);

      if (!member) {
        return null;
      }

      const [histories, songs] = await Promise.all([
        eventRepo.findHistoryByMemberId(member.id),
        songRepo.findByMemberId(member.id),
      ]);

      const mainGroupId = member.groups[0]?.groupId;
      const mainGroupPenlightColorNames = mainGroupId
        ? (groups.find((group) => group.id === mainGroupId)?.penlightColors ?? []).map(
            (color) => color.name
          )
        : [];

      return {
        histories,
        mainGroupPenlightColorNames,
        member,
        songs,
      };
    })
);

const loadSongsPageData = createSharedReadLoader(
  ["orbit", "songs-page-data"],
  [
    ORBIT_CACHE_TAGS.groups,
    ORBIT_CACHE_TAGS.songs,
    ORBIT_CACHE_TAGS.songsList,
  ],
  async (groupId?: string) =>
    withOrbitReadClient(async (supabase) => {
      const filters: SongFiltersType = { groupId };

      const [songs, groups] = await Promise.all([
        listPublicSongs(createSongRepository(supabase), filters),
        getGroups(createGroupRepository(supabase)),
      ]);

      return {
        groups,
        songs,
      };
    })
);

const loadSongDetailPageData = createSharedReadLoader(
  ["orbit", "song-detail-page-data"],
  [ORBIT_CACHE_TAGS.songs, ORBIT_CACHE_TAGS.songsDetail],
  async (id: string) =>
    withOrbitReadClient(async (supabase) => {
      return getSong(createSongRepository(supabase), id);
    })
);

const loadReleasesPageData = createSharedReadLoader(
  ["orbit", "releases-page-data"],
  [
    ORBIT_CACHE_TAGS.groups,
    ORBIT_CACHE_TAGS.releases,
    ORBIT_CACHE_TAGS.releasesList,
  ],
  async (groupId?: string, releaseType?: ReleaseFiltersType["releaseType"]) =>
    withOrbitReadClient(async (supabase) => {
      const filters: ReleaseFiltersType = {};

      if (groupId) {
        filters.groupId = groupId;
      }

      if (releaseType) {
        filters.releaseType = releaseType;
      }

      const [releases, groups] = await Promise.all([
        listPublicReleases(createReleaseRepository(supabase), filters),
        getGroups(createGroupRepository(supabase)),
      ]);

      return {
        groups,
        releases,
      };
    })
);

const loadReleaseDetailPageData = createSharedReadLoader(
  ["orbit", "release-detail-page-data"],
  [ORBIT_CACHE_TAGS.releases, ORBIT_CACHE_TAGS.releasesDetail],
  async (id: string) =>
    withOrbitReadClient(async (supabase) => {
      return getRelease(createReleaseRepository(supabase), id);
    })
);

export async function getTopPageData(
  year: number,
  month: number,
  day: number
) {
  return loadTopPageData(year, month, day);
}

export async function getMembersPageData(filters: MemberFiltersType) {
  return loadMembersPageData(filters.groupId, filters.status, filters.generation);
}

export async function getMemberDetailPageData(id: string) {
  return loadMemberDetailPageData(id);
}

export async function getSongsPageData(filters: SongFiltersType) {
  return loadSongsPageData(filters.groupId);
}

export async function getSongDetailPageData(id: string) {
  return loadSongDetailPageData(id);
}

export async function getReleasesPageData(filters: ReleaseFiltersType) {
  return loadReleasesPageData(filters.groupId, filters.releaseType);
}

export async function getReleaseDetailPageData(id: string) {
  return loadReleaseDetailPageData(id);
}
