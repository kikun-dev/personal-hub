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
  // #264: createSong と同様、is_catchall を DB で確定してから検証を分岐する。
  // groupId 未指定は validateSong 側で必須エラーにするため false 扱い。
  const isCatchallGroup = input.groupId
    ? await repo.isGroupCatchall(input.groupId)
    : false;
  const errors = validateSong(input, isCatchallGroup);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const song = await repo.update(id, input);
  return { ok: true, data: song };
}
