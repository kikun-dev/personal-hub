import type { SongRepository } from "@/types/repositories";
import type { Song } from "@/types/song";

export async function getSong(
  repo: SongRepository,
  id: string
): Promise<Song | null> {
  return repo.findById(id);
}
