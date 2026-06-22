import type { Group } from "@/types/group";
import type { MemberListItem, MemberSection } from "@/types/member";
import type { SongListItem, SongSection } from "@/types/song";

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

  return [...buckets.values()]
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
    }))
    .filter((section) => section.members.length > 0);
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

  return [...buckets.values()]
    .map((bucket) => ({
      group: bucket.group,
      songs: bucket.items,
    }))
    .filter((section) => section.songs.length > 0);
}
