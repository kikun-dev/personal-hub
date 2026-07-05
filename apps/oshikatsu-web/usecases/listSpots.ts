import type { SpotRepository } from "@/types/repositories";
import type { SpotListItem } from "@/types/spot";

export async function listSpots(repo: SpotRepository): Promise<SpotListItem[]> {
  return repo.findAll();
}
