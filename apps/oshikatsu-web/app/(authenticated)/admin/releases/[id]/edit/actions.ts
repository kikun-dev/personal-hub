"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { updateRelease } from "@/usecases/updateRelease";
import { deleteRelease } from "@/usecases/deleteRelease";
import type { UpdateReleaseInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function updateReleaseAction(
  id: string,
  input: UpdateReleaseInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createReleaseRepository(supabase);

  try {
    const result = await updateRelease(repo, id, input);
    if (!result.ok) {
      return { errors: result.errors };
    }
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "リリースが見つからないか、更新に失敗しました" }],
      };
    }
    throw e;
  }
}

export async function deleteReleaseAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createReleaseRepository(supabase);

  try {
    await deleteRelease(repo, id);
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "リリースの削除に失敗しました" };
    }
    throw e;
  }
}
