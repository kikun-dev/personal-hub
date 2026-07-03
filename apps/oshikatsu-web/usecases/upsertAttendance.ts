import type { AttendanceRepository } from "@/types/repositories";
import type { UpsertAttendanceInput } from "@/types/attendance";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateAttendance } from "./validateAttendance";

export async function upsertAttendance(
  repo: AttendanceRepository,
  userId: string,
  input: UpsertAttendanceInput
): Promise<Result<void, ValidationError[]>> {
  const errors = validateAttendance(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  await repo.upsert(userId, input);
  return { ok: true, data: undefined };
}
