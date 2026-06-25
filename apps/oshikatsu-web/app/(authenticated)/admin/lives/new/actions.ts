"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createLiveRepository } from "@/repositories/liveRepository";
import { revalidateOrbitLiveData } from "@/lib/revalidateOrbit";
import { createLive } from "@/usecases/createLive";
import type { CreateLiveInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function createLiveAction(
  input: CreateLiveInput
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
    const result = await createLive(repo, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitLiveData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "ライブの作成に失敗しました" }],
      };
    }
    throw e;
  }
}
