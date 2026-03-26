import type { MemberOption } from "@/types/member";
import type { MemberRepository } from "@/types/repositories";

export async function listMemberOptions(
  repo: MemberRepository
): Promise<MemberOption[]> {
  const members = await repo.findOptions();

  return members.sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }

    return 0;
  });
}
