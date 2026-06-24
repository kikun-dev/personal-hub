import type { MemberFilters, MemberListItem } from "@/types/member";

export type MemberStatus = NonNullable<MemberFilters["status"]>;

export function filterMembersByGroup(
  members: MemberListItem[],
  groupId: string
): MemberListItem[] {
  if (groupId === "") {
    return members;
  }
  return members.filter((member) =>
    member.groups.some((group) => group.groupId === groupId)
  );
}

export function filterMembersByStatus(
  members: MemberListItem[],
  status: MemberStatus
): MemberListItem[] {
  if (status === "all") {
    return members;
  }
  if (status === "active") {
    return members.filter((member) =>
      member.groups.some((group) => group.graduatedAt === null)
    );
  }
  // graduated: 在籍グループが1つもなく、すべて卒業済み
  return members.filter(
    (member) =>
      member.groups.length > 0 &&
      member.groups.every((group) => group.graduatedAt !== null)
  );
}

export function filterMembersByGeneration(
  members: MemberListItem[],
  generation: string
): MemberListItem[] {
  if (generation === "") {
    return members;
  }
  return members.filter((member) =>
    member.groups.some((group) => group.generation === generation)
  );
}
