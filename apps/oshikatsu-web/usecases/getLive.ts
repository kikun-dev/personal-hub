import type { LiveRepository } from "@/types/repositories";
import type { Live } from "@/types/live";

export async function getLive(
  repo: LiveRepository,
  id: string
): Promise<Live | null> {
  return repo.findById(id);
}
