import type { LiveRepository } from "@/types/repositories";
import type { LiveListItem } from "@/types/live";

export async function listPublicLives(
  repo: LiveRepository
): Promise<LiveListItem[]> {
  return repo.findPublicList();
}
