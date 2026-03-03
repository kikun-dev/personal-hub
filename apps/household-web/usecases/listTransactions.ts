import type { TransactionRepository } from "@/types/repositories";
import type { Transaction } from "@/types/transaction";

export type TransactionFilters = {
  year: number;
  month: number;
  type?: "income" | "expense";
};

export async function listTransactions(
  repo: TransactionRepository,
  userId: string,
  filters: TransactionFilters
): Promise<Transaction[]> {
  const transactions = await repo.findByMonth(
    userId,
    filters.year,
    filters.month
  );

  if (filters.type) {
    return transactions.filter((tx) => tx.type === filters.type);
  }

  return transactions;
}
