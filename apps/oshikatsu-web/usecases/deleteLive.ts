import type { LiveRepository } from "@/types/repositories";

export async function deleteLive(
  repo: LiveRepository,
  id: string
): Promise<void> {
  await repo.delete(id);
}
