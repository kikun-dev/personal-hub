import type { SongRepository } from "@/types/repositories";
import type { Song, UpdateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateSong } from "./validateSong";
import { validateParticipantScope } from "./validateParticipantScope";

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

  // #427: createSong と同様、参加メンバーの許可集合を DB で権威的に解決して検証する。
  if (!isCatchallGroup) {
    const scope = await repo.findFirstReleaseParticipants(
      input.releaseLinks.map((link) => link.releaseId)
    );
    const scopeErrors = validateParticipantScope(input.participantMemberIds, scope);
    if (scopeErrors.length > 0) {
      return { ok: false, errors: scopeErrors };
    }
  }

  const song = await repo.update(id, input);
  return { ok: true, data: song };
}
