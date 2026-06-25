"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createVenueRepository } from "@/repositories/venueRepository";
import { revalidateOrbitVenueData } from "@/lib/revalidateOrbit";
import { createVenue } from "@/usecases/createVenue";
import type { CreateVenueInput } from "@/types/venue";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function createVenueAction(
  input: CreateVenueInput
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
    const result = await createVenue(repo, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitVenueData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "会場の作成に失敗しました" }],
      };
    }
    throw e;
  }
}
