import type { WikiRepository } from "@/types/repositories";

export async function deleteWikiPage(
  repo: WikiRepository,
  id: string
): Promise<void> {
  await repo.delete(id);
}
