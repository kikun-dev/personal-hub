"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createSpotRepository } from "@/repositories/spotRepository";
import { revalidateOrbitSpotData } from "@/lib/revalidateOrbit";
import { updateSpot } from "@/usecases/updateSpot";
import { deleteSpot } from "@/usecases/deleteSpot";
import type { UpdateSpotInput } from "@/types/spot";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function updateSpotAction(
  id: string,
  input: UpdateSpotInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();

  const repo = createSpotRepository(supabase);

  try {
    const result = await updateSpot(repo, id, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitSpotData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "スポットが見つからないか、更新に失敗しました" }],
      };
    }
    throw e;
  }
}

export async function deleteSpotAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();

  const repo = createSpotRepository(supabase);

  try {
    await deleteSpot(repo, id);
    revalidateOrbitSpotData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "スポットの削除に失敗しました" };
    }
    throw e;
  }
}
