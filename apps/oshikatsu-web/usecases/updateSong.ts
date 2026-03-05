import type { SongRepository } from "@/types/repositories";
import type { Song, UpdateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateSong } from "./validateSong";

export async function updateSong(
  repo: SongRepository,
  id: string,
  input: UpdateSongInput
): Promise<Result<Song, ValidationError[]>> {
  const errors = validateSong(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const song = await repo.update(id, input);
  return { ok: true, data: song };
}
