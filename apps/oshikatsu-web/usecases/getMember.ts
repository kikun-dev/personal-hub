import type { MemberRepository } from "@/types/repositories";
import type { MemberWithGroups } from "@/types/member";

export async function getMember(
  repo: MemberRepository,
  id: string
): Promise<MemberWithGroups | null> {
  return repo.findById(id);
}
