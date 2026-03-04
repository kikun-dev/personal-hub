"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
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
    redirect("/login");
  }

  const repo = createTransactionRepository(supabase);
  const result = await createTransaction(repo, user.id, input);

  if (!result.ok) {
    return { errors: result.errors };
  }

  return {};
}
