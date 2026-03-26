"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createSongRepository } from "@/repositories/songRepository";
import { createSong } from "@/usecases/createSong";
import { revalidateOrbitSongData } from "@/lib/revalidateOrbit";
import type { CreateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

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
  try {
    const result = await createSong(repo, input);

    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitSongData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "楽曲の作成に失敗しました" }],
      };
    }
    throw e;
  }
}
