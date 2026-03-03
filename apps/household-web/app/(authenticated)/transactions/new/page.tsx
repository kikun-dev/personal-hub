import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCategoryRepository } from "@/repositories/categoryRepository";
import { createPaymentMethodRepository } from "@/repositories/paymentMethodRepository";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { createTransactionAction } from "./actions";
import type { CreateTransactionInput } from "@/types/transaction";
import type { ValidationError } from "@/types/errors";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [categories, paymentMethods] = await Promise.all([
    createCategoryRepository(supabase).findAll(user.id),
    createPaymentMethodRepository(supabase).findAll(user.id),
  ]);

  async function handleSubmit(
    values: CreateTransactionInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createTransactionAction(values);
    if (!result.errors) {
      redirect("/dashboard");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">新規入力</h1>
      <TransactionForm
        mode="create"
        categories={categories}
        paymentMethods={paymentMethods}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
