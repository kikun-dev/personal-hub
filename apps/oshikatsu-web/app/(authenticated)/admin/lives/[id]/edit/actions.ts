"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
