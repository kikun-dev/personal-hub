import type { Group } from "@/types/group";
import type { MemberListItem, MemberSection } from "@/types/member";
import type { ReleaseListItem, ReleaseSection } from "@/types/release";
import type { SongListItem, SongSection } from "@/types/song";
import type {
  PersonCreditedSong,
  PersonCreditedSongSection,
} from "@/types/person";

type SectionBucket<TItem> = {
  group: Group | null;
  items: TItem[];
};

const UNKNOWN_GROUP_SORT_ORDER = Number.MAX_SAFE_INTEGER;

function createGroupSortOrderMap(groups: Group[]): Map<string, number> {
  return new Map(groups.map((group) => [group.id, group.sortOrder]));
}

function getGroupSortOrder(
  groupId: string,
  groupSortOrderMap: Map<string, number>
): number {
  return groupSortOrderMap.get(groupId) ?? UNKNOWN_GROUP_SORT_ORDER;
}

function isActiveMember(member: MemberListItem): boolean {
  return member.groups.some((group) => group.graduatedAt === null);
}

function resolvePrimaryMemberGroupId(
  member: MemberListItem,
  groupSortOrderMap: Map<string, number>
): string | null {
  const [primaryGroup] = [...member.groups].sort((a, b) => {
    const aActiveRank = a.graduatedAt === null ? 0 : 1;
    const bActiveRank = b.graduatedAt === null ? 0 : 1;

    if (aActiveRank !== bActiveRank) {
      return aActiveRank - bActiveRank;
    }

    return (
      getGroupSortOrder(a.groupId, groupSortOrderMap) -
      getGroupSortOrder(b.groupId, groupSortOrderMap)
    );
  });

  return primaryGroup?.groupId ?? null;
}

function createSectionBuckets<TItem>(
  groups: Group[]
): Map<string, SectionBucket<TItem>> {
  return new Map(
    groups.map((group) => [
      group.id,
      {
        group,
        items: [],
      },
    ])
  );
}

function getOrCreateUngroupedBucket<TItem>(
  buckets: Map<string, SectionBucket<TItem>>
): SectionBucket<TItem> {
  const existingBucket = buckets.get("");

  if (existingBucket) {
    return existingBucket;
  }

  const bucket: SectionBucket<TItem> = {
    group: null,
    items: [],
  };
  buckets.set("", bucket);
  return bucket;
}

function getSectionSortOrder<TItem>(bucket: SectionBucket<TItem>): number {
  return bucket.group?.sortOrder ?? UNKNOWN_GROUP_SORT_ORDER;
}

function toSortedSectionBuckets<TItem>(
  buckets: Map<string, SectionBucket<TItem>>
): SectionBucket<TItem>[] {
  return [...buckets.values()]
    .filter((bucket) => bucket.items.length > 0)
    .sort((a, b) => getSectionSortOrder(a) - getSectionSortOrder(b));
}

export function createMemberSections(
  members: MemberListItem[],
  groups: Group[]
): MemberSection[] {
  const groupSortOrderMap = createGroupSortOrderMap(groups);
  const buckets = createSectionBuckets<MemberListItem>(groups);

  members.forEach((member) => {
    const groupId = resolvePrimaryMemberGroupId(member, groupSortOrderMap);
    const bucket = groupId
      ? buckets.get(groupId) ?? getOrCreateUngroupedBucket(buckets)
      : getOrCreateUngroupedBucket(buckets);

    bucket.items.push(member);
  });

  return toSortedSectionBuckets(buckets)
    .map((bucket) => ({
      group: bucket.group,
      members: bucket.items
        .map((member, index) => ({ index, member }))
        .sort((a, b) => {
          const aActiveRank = isActiveMember(a.member) ? 0 : 1;
          const bActiveRank = isActiveMember(b.member) ? 0 : 1;

          if (aActiveRank !== bActiveRank) {
            return aActiveRank - bActiveRank;
          }

          return a.index - b.index;
        })
        .map(({ member }) => member),
    }));
}

function compareSongsForListOrder(a: SongListItem, b: SongListItem): number {
  // リリース未紐付け（リリース日なし）はグループ内の末尾へ
  const aHasDate = a.firstReleaseDate !== null;
  const bHasDate = b.firstReleaseDate !== null;
  if (aHasDate !== bHasDate) {
    return aHasDate ? -1 : 1;
  }

  if (a.firstReleaseDate && b.firstReleaseDate) {
    // 代表（初出）リリース日の降順
    const dateCompare = b.firstReleaseDate.localeCompare(a.firstReleaseDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    // 同一リリース日内は代表リリースごとにまとめる（決定的順序）
    const aReleaseId = a.representativeReleaseId ?? "";
    const bReleaseId = b.representativeReleaseId ?? "";
    if (aReleaseId !== bReleaseId) {
      return aReleaseId.localeCompare(bReleaseId);
    }

    // 同一リリース内はトラック順（昇順）
    const aTrack = a.representativeTrackNumber ?? Number.MAX_SAFE_INTEGER;
    const bTrack = b.representativeTrackNumber ?? Number.MAX_SAFE_INTEGER;
    if (aTrack !== bTrack) {
      return aTrack - bTrack;
    }
  }

  // 最終タイブレーク（決定的にするためタイトル順）
  return a.title.localeCompare(b.title);
}

export function sortSongsForListOrder(songs: SongListItem[]): SongListItem[] {
  return [...songs].sort(compareSongsForListOrder);
}

export function createSongSections(
  songs: SongListItem[],
  groups: Group[]
): SongSection[] {
  const buckets = createSectionBuckets<SongListItem>(groups);

  songs.forEach((song) => {
    const bucket =
      buckets.get(song.groupId) ?? getOrCreateUngroupedBucket(buckets);
    bucket.items.push(song);
  });

  return toSortedSectionBuckets(buckets)
    .map((bucket) => ({
      group: bucket.group,
      songs: [...bucket.items].sort(compareSongsForListOrder),
    }));
}

// グループ内の担当楽曲を「リリース日昇順 → 曲順昇順」で並べる（古い曲・若い曲順を上に）
function comparePersonCreditedSongs(
  a: PersonCreditedSong,
  b: PersonCreditedSong
): number {
  // リリース未紐付け（リリース日なし）はグループ内の末尾へ
  const aHasDate = a.firstReleaseDate !== null;
  const bHasDate = b.firstReleaseDate !== null;
  if (aHasDate !== bHasDate) {
    return aHasDate ? -1 : 1;
  }

  if (a.firstReleaseDate && b.firstReleaseDate) {
    // 代表（初出）リリース日の昇順（古いものを上に）
    const dateCompare = a.firstReleaseDate.localeCompare(b.firstReleaseDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    // 同一リリース日は代表リリースごとにまとめる（決定的順序）
    const aReleaseId = a.representativeReleaseId ?? "";
    const bReleaseId = b.representativeReleaseId ?? "";
    if (aReleaseId !== bReleaseId) {
      return aReleaseId.localeCompare(bReleaseId);
    }
    // 同一リリース内は曲順の昇順
    const aTrack = a.representativeTrackNumber ?? Number.MAX_SAFE_INTEGER;
    const bTrack = b.representativeTrackNumber ?? Number.MAX_SAFE_INTEGER;
    if (aTrack !== bTrack) {
      return aTrack - bTrack;
    }
  }

  // 最終タイブレーク（決定的にするためタイトル順）
  return a.trackTitle.localeCompare(b.trackTitle, "ja");
}

// 制作陣詳細の担当楽曲を、楽曲一覧と同じグループ順で区切る。
// グループ内はリリース日昇順→曲順昇順。
export function createPersonCreditedSongSections(
  songs: PersonCreditedSong[],
  groups: Group[]
): PersonCreditedSongSection[] {
  const buckets = createSectionBuckets<PersonCreditedSong>(groups);

  songs.forEach((song) => {
    const bucket =
      buckets.get(song.groupId) ?? getOrCreateUngroupedBucket(buckets);
    bucket.items.push(song);
  });

  return toSortedSectionBuckets(buckets).map((bucket) => ({
    group: bucket.group,
    songs: [...bucket.items].sort(comparePersonCreditedSongs),
  }));
}

export function createReleaseSections(
  releases: ReleaseListItem[],
  groups: Group[]
): ReleaseSection[] {
  const buckets = createSectionBuckets<ReleaseListItem>(groups);

  releases.forEach((release) => {
    const bucket =
      buckets.get(release.groupId) ?? getOrCreateUngroupedBucket(buckets);
    bucket.items.push(release);
  });

  return toSortedSectionBuckets(buckets)
    .map((bucket) => ({
      group: bucket.group,
      releases: bucket.items,
    }));
}
