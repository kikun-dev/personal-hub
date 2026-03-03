import type { TransactionRepository } from "@/types/repositories";

export async function deleteTransaction(
  repo: TransactionRepository,
  userId: string,
  id: string
): Promise<void> {
  await repo.delete(userId, id);
}
