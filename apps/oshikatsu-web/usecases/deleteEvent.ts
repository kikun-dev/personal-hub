import type { EventRepository } from "@/types/repositories";

export async function deleteEvent(
  repo: EventRepository,
  id: string
): Promise<void> {
  await repo.delete(id);
}
