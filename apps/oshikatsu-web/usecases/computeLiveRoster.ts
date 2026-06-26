import type { MemberRepository } from "@/types/repositories";
import { isValidDateString } from "@/lib/validation";

// 出演グループと基準日（最初の公演日）から、その日に在籍中のメンバーIDを算出する。
// 入力境界（サーバーアクション経由）で呼ばれるため、ここで日付形式と groupId を検証する。
export async function computeLiveRoster(
  repo: MemberRepository,
  groupIds: string[],
  date: string
): Promise<string[]> {
  const cleanGroupIds = [...new Set(groupIds.filter((id) => id !== ""))];
  if (cleanGroupIds.length === 0 || !isValidDateString(date)) {
    return [];
  }
  return repo.findActiveMemberIdsByGroups(cleanGroupIds, date);
}
