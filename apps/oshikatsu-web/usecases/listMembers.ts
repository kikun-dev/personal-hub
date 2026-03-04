import type { MemberRepository } from "@/types/repositories";
import type { MemberWithGroups, MemberFilters } from "@/types/member";

export async function listMembers(
  repo: MemberRepository,
  filters?: MemberFilters
): Promise<MemberWithGroups[]> {
  return repo.findAll(filters);
}
