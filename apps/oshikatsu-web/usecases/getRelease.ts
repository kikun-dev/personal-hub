import type { ReleaseRepository } from "@/types/repositories";
import type { Release } from "@/types/release";

export async function getRelease(
  repo: ReleaseRepository,
  id: string
): Promise<Release | null> {
  return repo.findById(id);
}
