"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createSpotPhotoRepository } from "@/repositories/spotPhotoRepository";
import { uploadSpotPhoto } from "@/usecases/uploadSpotPhoto";
import type { SpotPhotoUploadInput } from "@/types/spot";
import type { ValidationError } from "@/types/errors";

// スポット写真は new/edit の両ページで同じアップロード導線を使う（object path が
// スポットIDに依存しないため spotId を受け取る必要が無い）。フォーム側は
// ファイル選択時に即このアクションを呼び、返ってきた imagePath を form state に
// 積む（保存前でも Storage 上には実体が存在する。保存を中断した場合の孤児ファイルは
// 許容する既存の非致命的クリーンアップ方針に準じる）。
export async function uploadSpotPhotoAction(
  imageFile: SpotPhotoUploadInput
): Promise<{ imagePath?: string; errors?: ValidationError[] }> {
  const supabase = await requireAdmin();
  const repo = createSpotPhotoRepository(supabase);

  const result = await uploadSpotPhoto(repo, { imageFile });
  if (!result.ok) {
    return { errors: result.errors };
  }

  return { imagePath: result.data };
}
