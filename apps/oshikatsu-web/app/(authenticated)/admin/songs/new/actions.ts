"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createSongRepository } from "@/repositories/songRepository";
import { createSong } from "@/usecases/createSong";
import { revalidateOrbitSongData } from "@/lib/revalidateOrbit";
import type { CreateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";
import {
  isDuplicateTrackNumberError,
  DUPLICATE_TRACK_NUMBER_MESSAGE,
} from "@/lib/releaseTrackErrors";
import { toRepositoryErrorLog } from "@/lib/logRepositoryError";

export async function createSongAction(
  input: CreateSongInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();

  const repo = createSongRepository(supabase);
  try {
    const result = await createSong(repo, input);

    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitSongData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      console.error("createSongAction: repository error", toRepositoryErrorLog(e));
      if (isDuplicateTrackNumberError(e)) {
        return {
          errors: [{ field: "_form", message: DUPLICATE_TRACK_NUMBER_MESSAGE }],
        };
      }
      return {
        errors: [{ field: "_form", message: "楽曲の作成に失敗しました" }],
      };
    }
    throw e;
  }
}
