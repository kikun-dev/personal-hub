import type { ReleaseRepository } from "@/types/repositories";

export async function deleteRelease(
  repo: ReleaseRepository,
  id: string
): Promise<void> {
  await repo.delete(id);
}
