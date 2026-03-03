"use server";

import { createClient } from "@/lib/supabase/server";
import { createTransactionRepository } from "@/repositories/transactionRepository";
import { createTransaction } from "@/usecases/createTransaction";
import type { CreateTransactionInput } from "@/types/transaction";
import type { ValidationError } from "@/types/errors";

export async function createTransactionAction(
  input: CreateTransactionInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { errors: [{ field: "auth", message: "認証が必要です" }] };
  }

  const repo = createTransactionRepository(supabase);
  const result = await createTransaction(repo, user.id, input);

  if (!result.ok) {
    return { errors: result.errors };
  }

  return {};
}
