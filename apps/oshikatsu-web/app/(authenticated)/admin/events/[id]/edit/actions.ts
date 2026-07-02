"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createEventRepository } from "@/repositories/eventRepository";
import { updateEvent } from "@/usecases/updateEvent";
import { deleteEvent } from "@/usecases/deleteEvent";
import { revalidateOrbitEventData } from "@/lib/revalidateOrbit";
import type { UpdateEventInput } from "@/types/event";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

export async function updateEventAction(
  id: string,
  input: UpdateEventInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await requireAdmin();

  const repo = createEventRepository(supabase);

  try {
    const result = await updateEvent(repo, id, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    revalidateOrbitEventData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "イベントが見つからないか、更新に失敗しました" }],
      };
    }
    throw e;
  }
}

export async function deleteEventAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await requireAdmin();

  const repo = createEventRepository(supabase);

  try {
    await deleteEvent(repo, id);
    revalidateOrbitEventData();
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "イベントの削除に失敗しました" };
    }
    throw e;
  }
}
