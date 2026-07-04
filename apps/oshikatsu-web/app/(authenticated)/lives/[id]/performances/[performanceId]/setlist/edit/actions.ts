"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createLiveRepository } from "@/repositories/liveRepository";
import { createSongRepository } from "@/repositories/songRepository";
import { getSong } from "@/usecases/getSong";
import { validateSetlist } from "@/usecases/validateSetlist";
import { revalidateOrbitLiveData } from "@/lib/revalidateOrbit";
import type { ReplaceSetlistInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function replacePerformanceSetlistAction(
  performanceId: string,
  input: ReplaceSetlistInput,
  rosterMemberIds: string[]
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();
  const validationErrors = validateSetlist(input.items, rosterMemberIds);
  if (validationErrors.length > 0) {
    return { errors: validationErrors };
  }
  const repo = createLiveRepository(supabase);
  try {
    await repo.replaceSetlist(performanceId, input);
    revalidateOrbitLiveData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { errors: [{ field: "_form", message: "セットリストの保存に失敗しました" }] };
    }
    throw e;
  }
}

// 楽曲マスタのフォーメーションを、セトリ編集のフォーメーション行（member_ids の配列）へ変換して返す。
// 各行を slot_order 昇順に整列した member_id 列にする。
export async function getTrackSetlistFormationAction(
  trackId: string
): Promise<{ rows: { memberIds: string[] }[] }> {
  const supabase = await requireAdmin();
  const song = await getSong(createSongRepository(supabase), trackId);
  if (!song) return { rows: [] };
  const rows = song.formationRows
    .slice()
    .sort((a, b) => a.rowNumber - b.rowNumber)
    .map((row) => ({
      memberIds: row.members
        .slice()
        .sort((a, b) => a.slotOrder - b.slotOrder)
        .map((m) => m.memberId),
    }))
    .filter((row) => row.memberIds.length > 0);
  return { rows };
}
