import type { SongFilters, SongListItem } from "@/types/song";
import type { SongRepository } from "@/types/repositories";

export async function listPublicSongs(
  repo: SongRepository,
  filters?: SongFilters
): Promise<SongListItem[]> {
  return repo.findPublicList(filters);
}
