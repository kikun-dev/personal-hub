import type { ReleaseFilters, ReleaseListItem } from "@/types/release";
import type { ReleaseRepository } from "@/types/repositories";

export async function listPublicReleases(
  repo: ReleaseRepository,
  filters?: ReleaseFilters
): Promise<ReleaseListItem[]> {
  return repo.findPublicList(filters);
}
