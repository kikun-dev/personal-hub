import type { VenueRepository } from "@/types/repositories";
import type { Venue, UpdateVenueInput } from "@/types/venue";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateVenue } from "./validateVenue";

export async function updateVenue(
  repo: VenueRepository,
  id: string,
  input: UpdateVenueInput
): Promise<Result<Venue, ValidationError[]>> {
  const errors = validateVenue(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const venue = await repo.update(id, input);
  return { ok: true, data: venue };
}
