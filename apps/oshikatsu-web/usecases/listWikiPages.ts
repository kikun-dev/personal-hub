import type { WikiRepository } from "@/types/repositories";
import type { WikiPageListItem } from "@/types/wiki";

export async function listWikiPages(
  repo: WikiRepository
): Promise<WikiPageListItem[]> {
  return repo.findAll();
}
