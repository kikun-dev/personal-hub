"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createLiveRepository } from "@/repositories/liveRepository";
import { revalidateOrbitLiveData } from "@/lib/revalidateOrbit";
import { updateLive } from "@/usecases/updateLive";
import { deleteLive } from "@/usecases/deleteLive";
import type { UpdateLiveInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function updateLiveAction(
  id: string,
  input: UpdateLiveInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();

  const repo = createLiveRepository(supabase);

  try {
    const result = await updateLive(repo, id, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitLiveData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      // 23503（FK RESTRICT）はrepositoryが既にユーザー向け文言に変換済みなので、
      // その文言をそのまま使う。それ以外は従来どおり汎用メッセージにフォールバックする。
      const cause = e.cause as { code?: string } | null;
      if (cause?.code === "23503") {
        return { errors: [{ field: "_form", message: e.message }] };
      }
      return {
        errors: [{ field: "_form", message: "ライブが見つからないか、更新に失敗しました" }],
      };
    }
    throw e;
  }
}

export async function deleteLiveAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();

  const repo = createLiveRepository(supabase);

  try {
    await deleteLive(repo, id);
    revalidateOrbitLiveData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "ライブの削除に失敗しました" };
    }
    throw e;
  }
}
