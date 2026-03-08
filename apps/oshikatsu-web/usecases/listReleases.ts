import type { ReleaseRepository } from "@/types/repositories";
import type { Release, ReleaseFilters } from "@/types/release";

export async function listReleases(
  repo: ReleaseRepository,
  filters?: ReleaseFilters
): Promise<Release[]> {
  return repo.findAll(filters);
}
