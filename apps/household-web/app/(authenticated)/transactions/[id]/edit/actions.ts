"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createTransactionRepository } from "@/repositories/transactionRepository";
import { updateTransaction } from "@/usecases/updateTransaction";
import { deleteTransaction } from "@/usecases/deleteTransaction";
import type { UpdateTransactionInput } from "@/types/transaction";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

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

  try {
    const result = await updateTransaction(repo, user.id, id, input);

    if (!result.ok) {
      return { errors: result.errors };
    }

    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "取引が見つからないか、更新に失敗しました" }],
      };
    }
    throw e;
  }
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

  try {
    await deleteTransaction(repo, user.id, id);
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "取引の削除に失敗しました" };
    }
    throw e;
  }
}
