import type { MemberRepository } from "@/types/repositories";
import type { MemberWithGroups, MemberFilters } from "@/types/member";

function isActiveMember(member: MemberWithGroups): boolean {
  return member.groups.some((g) => g.graduatedAt === null);
}

export async function listMembers(
  repo: MemberRepository,
  filters?: MemberFilters
): Promise<MemberWithGroups[]> {
  const members = await repo.findAll(filters);

  return members.sort((a, b) => {
    // 現役メンバーを先に表示
    const aActive = isActiveMember(a);
    const bActive = isActiveMember(b);
    if (aActive !== bActive) return aActive ? -1 : 1;

    // 同一ステータス内はかな順（repository の order を維持）
    return 0;
  });
}
