import type { MemberRepository } from "@/types/repositories";

// 出演グループと基準日（最初の公演日）から、その日に在籍中のメンバーIDを算出する
export async function computeLiveRoster(
  repo: MemberRepository,
  groupIds: string[],
  date: string
): Promise<string[]> {
  if (groupIds.length === 0 || !date) {
    return [];
  }
  return repo.findActiveMemberIdsByGroups(groupIds, date);
}
