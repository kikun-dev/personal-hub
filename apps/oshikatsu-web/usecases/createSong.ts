import type { SongRepository } from "@/types/repositories";
import type { Song, CreateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateSong } from "./validateSong";
import { validateParticipantScope } from "./validateParticipantScope";

export async function createSong(
  repo: SongRepository,
  input: CreateSongInput
): Promise<Result<Song, ValidationError[]>> {
  // #264: 「その他」受け皿グループはリリース等の必須項目を持たないため、
  // グループの is_catchall を DB で確定してから検証条件を分岐する
  // （フォーム側の非表示と一致させる。クライアント入力は信用しない）。
  // groupId 未指定は validateSong 側で必須エラーにするため、ここでは false 扱い。
  const isCatchallGroup = input.groupId
    ? await repo.isGroupCatchall(input.groupId)
    : false;
  const errors = validateSong(input, isCatchallGroup);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // #427: 参加メンバーの許可集合はクライアント由来のリリース情報を信用せず、
  // releaseId から DB で初出リリースを解決して検証する。catch-all 楽曲は
  // リリースも参加メンバーも持たないため対象外。
  if (!isCatchallGroup) {
    const scope = await repo.findFirstReleaseParticipants(
      input.releaseLinks.map((link) => link.releaseId)
    );
    const scopeErrors = validateParticipantScope(input.participantMemberIds, scope);
    if (scopeErrors.length > 0) {
      return { ok: false, errors: scopeErrors };
    }
  }

  const song = await repo.create(input);
  return { ok: true, data: song };
}
