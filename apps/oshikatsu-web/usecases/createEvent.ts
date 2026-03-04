import type { EventRepository } from "@/types/repositories";
import type { Event, CreateEventInput } from "@/types/event";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateEvent } from "./validateEvent";

export async function createEvent(
  repo: EventRepository,
  input: CreateEventInput
): Promise<Result<Event, ValidationError[]>> {
  const errors = validateEvent(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const event = await repo.create(input);
  return { ok: true, data: event };
}
