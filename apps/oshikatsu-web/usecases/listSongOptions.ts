import type { SongRepository } from "@/types/repositories";
import type { SongOption } from "@/types/song";

export async function listSongOptions(
  repo: SongRepository
): Promise<SongOption[]> {
  return repo.findOptions();
}
