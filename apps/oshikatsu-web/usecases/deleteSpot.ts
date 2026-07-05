import type { SpotRepository } from "@/types/repositories";

export async function deleteSpot(
  repo: SpotRepository,
  id: string
): Promise<void> {
  await repo.delete(id);
}
