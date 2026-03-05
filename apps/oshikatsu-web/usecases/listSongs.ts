import type { SongRepository } from "@/types/repositories";
import type { Song, SongFilters } from "@/types/song";

export async function listSongs(
  repo: SongRepository,
  filters?: SongFilters
): Promise<Song[]> {
  return repo.findAll(filters);
}
