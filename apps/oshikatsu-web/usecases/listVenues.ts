import type { VenueRepository } from "@/types/repositories";
import type { Venue } from "@/types/venue";

export async function listVenues(repo: VenueRepository): Promise<Venue[]> {
  return repo.findAll();
}
