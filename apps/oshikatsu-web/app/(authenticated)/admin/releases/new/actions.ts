"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createRelease } from "@/usecases/createRelease";
import type { CreateReleaseInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";

export async function createReleaseAction(
  input: CreateReleaseInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createReleaseRepository(supabase);
  const result = await createRelease(repo, input);

  if (!result.ok) {
    return { errors: result.errors };
  }

  return {};
}
