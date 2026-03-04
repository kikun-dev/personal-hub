import type { EventTypeRepository } from "@/types/repositories";
import type { EventType } from "@/types/eventType";

export async function getEventTypes(
  repo: EventTypeRepository
): Promise<EventType[]> {
  return repo.findAll();
}
