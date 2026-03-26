import type { MemberListItem, MemberFilters } from "@/types/member";
import type { MemberRepository } from "@/types/repositories";

function isActiveMember(member: MemberListItem): boolean {
  return member.groups.some((group) => group.graduatedAt === null);
}

export async function listPublicMembers(
  repo: MemberRepository,
  filters?: MemberFilters
): Promise<MemberListItem[]> {
  const members = await repo.findPublicList(filters);

  return members.sort((a, b) => {
    const aActive = isActiveMember(a);
    const bActive = isActiveMember(b);
    if (aActive !== bActive) return aActive ? -1 : 1;
    return 0;
  });
}
