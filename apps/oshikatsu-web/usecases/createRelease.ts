import type { ReleaseRepository } from "@/types/repositories";
import type { Release, CreateReleaseInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateRelease } from "./validateRelease";
import { validateReleaseParticipantImpact } from "./validateReleaseParticipantImpact";

export async function createRelease(
  repo: ReleaseRepository,
  input: CreateReleaseInput
): Promise<Result<Release, ValidationError[]>> {
  const errors = validateRelease(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const trackIds = input.trackLinks.map((link) => link.trackId);
  const facts = await repo.findTrackParticipantScopeFacts(trackIds);
  const impactErrors = validateReleaseParticipantImpact(facts, {
    kind: "create",
    releaseDate: input.releaseDate || null,
    trackIds,
    participantMemberIds: input.participantMemberIds,
  });
  if (impactErrors.length > 0) {
    return { ok: false, errors: impactErrors };
  }

  const release = await repo.create(input);
  return { ok: true, data: release };
}
