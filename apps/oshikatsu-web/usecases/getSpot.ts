import type { SpotRepository } from "@/types/repositories";
import type { Spot } from "@/types/spot";

export async function getSpot(
  repo: SpotRepository,
  id: string
): Promise<Spot | null> {
  return repo.findById(id);
}
