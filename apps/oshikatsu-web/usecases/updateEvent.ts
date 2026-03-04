import type { EventRepository } from "@/types/repositories";
import type { Event, UpdateEventInput } from "@/types/event";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateEvent } from "./validateEvent";

export async function updateEvent(
  repo: EventRepository,
  id: string,
  input: UpdateEventInput
): Promise<Result<Event, ValidationError[]>> {
  const errors = validateEvent(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const event = await repo.update(id, input);
  return { ok: true, data: event };
}
