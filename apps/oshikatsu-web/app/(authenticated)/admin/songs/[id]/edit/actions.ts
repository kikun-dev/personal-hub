"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createSongRepository } from "@/repositories/songRepository";
import { updateSong } from "@/usecases/updateSong";
import { deleteSong } from "@/usecases/deleteSong";
import type { UpdateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function updateSongAction(
  id: string,
  input: UpdateSongInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createSongRepository(supabase);

  try {
    const result = await updateSong(repo, id, input);
    if (!result.ok) {
      return { errors: result.errors };
    }
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "楽曲が見つからないか、更新に失敗しました" }],
      };
    }
    throw e;
  }
}

export async function deleteSongAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createSongRepository(supabase);

  try {
    await deleteSong(repo, id);
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "楽曲の削除に失敗しました" };
    }
    throw e;
  }
}
