import type { MemberRepository } from "@/types/repositories";
import type { MemberWithGroups, UpdateMemberInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateMember } from "./validateMember";

export async function updateMember(
  repo: MemberRepository,
  id: string,
  input: UpdateMemberInput
): Promise<Result<MemberWithGroups, ValidationError[]>> {
  const errors = validateMember(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const member = await repo.update(id, input);
  return { ok: true, data: member };
}
