import type { MemberRepository } from "@/types/repositories";

export async function deleteMember(
  repo: MemberRepository,
  id: string
): Promise<void> {
  await repo.delete(id);
}
