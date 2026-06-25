"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createVenueRepository } from "@/repositories/venueRepository";
import { revalidateOrbitVenueData } from "@/lib/revalidateOrbit";
import { updateVenue } from "@/usecases/updateVenue";
import { deleteVenue } from "@/usecases/deleteVenue";
import type { UpdateVenueInput } from "@/types/venue";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function updateVenueAction(
  id: string,
  input: UpdateVenueInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createVenueRepository(supabase);

  try {
    const result = await updateVenue(repo, id, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitVenueData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "会場が見つからないか、更新に失敗しました" }],
      };
    }
    throw e;
  }
}

export async function deleteVenueAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createVenueRepository(supabase);

  try {
    await deleteVenue(repo, id);
    revalidateOrbitVenueData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "会場の削除に失敗しました" };
    }
    throw e;
  }
}
