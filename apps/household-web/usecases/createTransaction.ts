import type { TransactionRepository } from "@/types/repositories";
import type { Transaction, CreateTransactionInput } from "@/types/transaction";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateTransaction } from "./validateTransaction";

export async function createTransaction(
  repo: TransactionRepository,
  userId: string,
  input: CreateTransactionInput
): Promise<Result<Transaction, ValidationError[]>> {
  const errors = validateTransaction(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const transaction = await repo.create(userId, input);
  return { ok: true, data: transaction };
}
