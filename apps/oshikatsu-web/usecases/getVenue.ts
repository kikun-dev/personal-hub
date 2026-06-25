import type { VenueRepository } from "@/types/repositories";
import type { Venue } from "@/types/venue";

export async function getVenue(
  repo: VenueRepository,
  id: string
): Promise<Venue | null> {
  return repo.findById(id);
}
