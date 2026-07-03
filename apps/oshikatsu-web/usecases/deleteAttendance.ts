import type { AttendanceRepository } from "@/types/repositories";

export async function deleteAttendance(
  repo: AttendanceRepository,
  performanceId: string
): Promise<void> {
  await repo.delete(performanceId);
}
