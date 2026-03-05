"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createSongRepository } from "@/repositories/songRepository";
import { createSong } from "@/usecases/createSong";
import type { CreateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";

export async function createSongAction(
  input: CreateSongInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createSongRepository(supabase);
  const result = await createSong(repo, input);

  if (!result.ok) {
    return { errors: result.errors };
  }

  return {};
}
