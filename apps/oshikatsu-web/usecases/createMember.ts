import type { MemberRepository } from "@/types/repositories";
import type { MemberWithGroups, CreateMemberInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateMember } from "./validateMember";
import { calculateZodiac } from "@/lib/zodiac";

export async function createMember(
  repo: MemberRepository,
  input: CreateMemberInput
): Promise<Result<MemberWithGroups, ValidationError[]>> {
  const errors = validateMember(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const member = await repo.create({
    ...input,
    zodiac: calculateZodiac(input.dateOfBirth) ?? "",
  });
  return { ok: true, data: member };
}
