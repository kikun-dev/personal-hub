import type { SongRepository } from "@/types/repositories";

export async function deleteSong(
  repo: SongRepository,
  id: string
): Promise<void> {
  await repo.delete(id);
}
