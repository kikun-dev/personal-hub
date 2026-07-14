// Orbit の閲覧系ページローダー（ADR 0006 shared read cache）。
// top / member / song / release ドメインの read model を集約する。
// 共有キャッシュ基盤（withOrbitReadClient / createSharedReadLoader）は orbitReadLoader.ts を参照。
import { ORBIT_CACHE_TAGS } from "@/lib/cacheTags";
import { formatSelectionPositionLabel } from "@/lib/selectionPositionLabel";
import { createEventRepository } from "@/repositories/eventRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createSongRepository } from "@/repositories/songRepository";
import { sortMemberSongsByReleaseOrder } from "@/usecases/memberSongOrder";
import { createLiveRepository } from "@/repositories/liveRepository";
import { getGroups } from "@/usecases/getGroups";
import { getMember } from "@/usecases/getMember";
import { getRelease } from "@/usecases/getRelease";
import { getSong } from "@/usecases/getSong";
import { getSongPerformanceSummary } from "@/usecases/getSongPerformanceSummary";
import { getTopPageContent } from "@/usecases/getTopPageContent";
import {
  createMemberSections,
  createSongSections,
  sortSongsForListOrder,
} from "@/usecases/groupListSections";
import { listPublicMembers } from "@/usecases/listPublicMembers";
import { listPublicReleases } from "@/usecases/listPublicReleases";
import { listPublicSongs } from "@/usecases/listPublicSongs";
import type { MemberFilters as MemberFiltersType } from "@/types/member";
import type { ReleaseFilters as ReleaseFiltersType } from "@/types/release";
import type { SongFilters as SongFiltersType } from "@/types/song";
import {
  createSharedReadLoader,
  withOrbitReadClient,
} from "@/usecases/orbitReadLoader";

const loadTopPageData = createSharedReadLoader(
  // v2: #346 で LiveCalendarEvent へ performanceId を追加し日次系を performance 単位へ
  // 変更した。unstable_cache は key が同じ限り旧 deployment の payload を返し得るため、
  // DTO の形が変わる変更では schema version を bump して旧 payload を再利用しない。
  ["orbit", "top-page-data", "v2"],
  [
    ORBIT_CACHE_TAGS.top,
    ORBIT_CACHE_TAGS.lives,
    ORBIT_CACHE_TAGS.releases,
    ORBIT_CACHE_TAGS.songs,
  ],
  // 今日の日付（todayYear/Month/Day）を unstable_cache の引数に含めることで、
  // 日付跨ぎ後の再訪問時にキャッシュキーが変わり todayEvents / nextEvents が
  // 陳腐化した古いキャッシュを再利用してしまうのを防ぐ（#344）。
  async (
    year: number,
    month: number,
    day: number,
    todayYear: number,
    todayMonth: number,
    todayDay: number
  ) =>
    withOrbitReadClient(async (supabase) => {
      return getTopPageContent(
        createEventRepository(supabase),
        createMemberRepository(supabase),
        createLiveRepository(supabase),
        createReleaseRepository(supabase),
        createSongRepository(supabase),
        year,
        month,
        day,
        todayYear,
        todayMonth,
        todayDay
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
        memberSections: createMemberSections(members, groups),
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
      const releaseRepo = createReleaseRepository(supabase);

      const [member, groups] = await Promise.all([
        getMember(memberRepo, id),
        getGroups(groupRepo),
      ]);

      if (!member) {
        return null;
      }

      const [histories, songs, centerTrackIds, rawSelectionPositions] =
        await Promise.all([
          eventRepo.findHistoryByMemberId(member.id),
          songRepo.findByMemberId(member.id),
          songRepo.findCenterTrackIdsByMemberId(member.id),
          releaseRepo.findSelectionPositionsByMemberId(member.id),
        ]);

      // シングルごとの選抜ポジションを表示用ラベルに整形する（期は所属から）
      const selectionPositions = rawSelectionPositions.map((position) => ({
        releaseId: position.releaseId,
        numbering: position.numbering,
        label: formatSelectionPositionLabel(
          position,
          member.groups.find((group) => group.groupId === position.groupId)
            ?.generation ?? null
        ),
      }));

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
        songs: sortMemberSongsByReleaseOrder(songs),
        centerTrackIds,
        selectionPositions,
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
        // 楽曲一覧ページは「その他」も含めて表示する（トグル・絞り込みで扱うため）
        getGroups(createGroupRepository(supabase), { includeCatchall: true }),
      ]);

      return {
        groups,
        // セクション表示はグループ分け＋セクション内整列を createSongSections に集約
        songSections: createSongSections(songs, groups),
        // グループ絞り込み時のフラット表示用は同じ整列ロジックを適用
        songs: sortSongsForListOrder(songs),
      };
    })
);

const loadSongDetailPageData = createSharedReadLoader(
  ["orbit", "song-detail-page-data"],
  [ORBIT_CACHE_TAGS.songs, ORBIT_CACHE_TAGS.songsDetail],
  async (id: string) =>
    withOrbitReadClient(async (supabase) => {
      const songRepo = createSongRepository(supabase);

      const [song, occurrences] = await Promise.all([
        getSong(songRepo, id),
        songRepo.findPerformanceOccurrences(id),
      ]);

      if (!song) {
        return null;
      }

      // 総披露回数（#281）は全ユーザー共通の客観集計のため、個人の遭遇記録
      // （ADR 0009 対象）と異なりここで合成して shared cache に載せる
      return {
        song,
        performanceSummary: getSongPerformanceSummary(occurrences),
      };
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
  day: number,
  todayYear: number,
  todayMonth: number,
  todayDay: number
) {
  return loadTopPageData(year, month, day, todayYear, todayMonth, todayDay);
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
