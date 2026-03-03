"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTransactionRepository } from "@/repositories/transactionRepository";
import { updateTransaction } from "@/usecases/updateTransaction";
import { deleteTransaction } from "@/usecases/deleteTransaction";
import type { UpdateTransactionInput } from "@/types/transaction";
import type { ValidationError } from "@/types/errors";

export async function updateTransactionAction(
  id: string,
  input: UpdateTransactionInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createTransactionRepository(supabase);
  const result = await updateTransaction(repo, user.id, id, input);

  if (!result.ok) {
    return { errors: result.errors };
  }

  return {};
}

export async function deleteTransactionAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createTransactionRepository(supabase);
  await deleteTransaction(repo, user.id, id);

  return {};
}
