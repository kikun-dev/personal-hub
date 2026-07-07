import type { WikiRepository } from "@/types/repositories";
import type { WikiPage } from "@/types/wiki";

export async function getWikiPage(
  repo: WikiRepository,
  slug: string
): Promise<WikiPage | null> {
  return repo.findBySlug(slug);
}
