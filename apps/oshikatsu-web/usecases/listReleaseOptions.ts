import type { ReleaseOption } from "@/types/release";
import type { ReleaseRepository } from "@/types/repositories";

export async function listReleaseOptions(
  repo: ReleaseRepository
): Promise<ReleaseOption[]> {
  return repo.findOptions();
}
