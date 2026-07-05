"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createSpotRepository } from "@/repositories/spotRepository";
import { revalidateOrbitSpotData } from "@/lib/revalidateOrbit";
import { createSpot } from "@/usecases/createSpot";
import type { CreateSpotInput } from "@/types/spot";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function createSpotAction(
  input: CreateSpotInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();

  const repo = createSpotRepository(supabase);

  try {
    const result = await createSpot(repo, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitSpotData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "スポットの作成に失敗しました" }],
      };
    }
    throw e;
  }
}
