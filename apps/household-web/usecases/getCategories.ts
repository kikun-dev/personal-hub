import type { CategoryRepository } from "@/types/repositories";
import type { Category } from "@/types/category";

export async function getCategories(
  repo: CategoryRepository,
  userId: string
): Promise<Category[]> {
  return repo.findAll(userId);
}
