import type { TransactionRepository } from "@/types/repositories";
import type { Transaction, UpdateTransactionInput } from "@/types/transaction";
import type { ValidationError } from "@/types/errors";
import type { Result } from "@/types/result";
import { validateTransaction } from "./validateTransaction";

export async function updateTransaction(
  repo: TransactionRepository,
  userId: string,
  id: string,
  input: UpdateTransactionInput
): Promise<Result<Transaction, ValidationError[]>> {
  const errors = validateTransaction(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const transaction = await repo.update(userId, id, input);
  return { ok: true, data: transaction };
}
