"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createEventRepository } from "@/repositories/eventRepository";
import { createEvent } from "@/usecases/createEvent";
import { revalidateOrbitEventData } from "@/lib/revalidateOrbit";
import type { CreateEventInput } from "@/types/event";
import type { ValidationError } from "@/types/errors";

export async function createEventAction(
  input: CreateEventInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createEventRepository(supabase);
  const result = await createEvent(repo, input);

  if (!result.ok) {
    return { errors: result.errors };
  }

  revalidateOrbitEventData();
  return {};
}
