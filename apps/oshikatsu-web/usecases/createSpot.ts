import type { SpotRepository } from "@/types/repositories";
import type { Spot, CreateSpotInput } from "@/types/spot";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateSpot } from "./validateSpot";

export async function createSpot(
  repo: SpotRepository,
  input: CreateSpotInput
): Promise<Result<Spot, ValidationError[]>> {
  const errors = validateSpot(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const spot = await repo.create(input);
  return { ok: true, data: spot };
}
