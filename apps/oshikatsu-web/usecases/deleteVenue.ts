import type { VenueRepository } from "@/types/repositories";

export async function deleteVenue(
  repo: VenueRepository,
  id: string
): Promise<void> {
  await repo.delete(id);
}
