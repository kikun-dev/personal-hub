import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTransactionRepository } from "@/repositories/transactionRepository";
import { createCategoryRepository } from "@/repositories/categoryRepository";
import { createPaymentMethodRepository } from "@/repositories/paymentMethodRepository";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { DeleteTransactionButton } from "@/components/transactions/DeleteTransactionButton";
import { updateTransactionAction, deleteTransactionAction } from "./actions";
import type { UpdateTransactionInput } from "@/types/transaction";
import type { ValidationError } from "@/types/errors";

type EditTransactionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTransactionPage({
  params,
}: EditTransactionPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [transaction, categories, paymentMethods] = await Promise.all([
    createTransactionRepository(supabase).findById(user.id, id),
    createCategoryRepository(supabase).findAll(user.id),
    createPaymentMethodRepository(supabase).findAll(user.id),
  ]);

  if (!transaction) {
    notFound();
  }

  const initialValues: UpdateTransactionInput = {
    date: transaction.date,
    amount: transaction.amount,
    categoryId: transaction.categoryId,
    paymentMethodId: transaction.paymentMethodId,
    memo: transaction.memo,
    isOshikatsu: transaction.isOshikatsu,
    groupName: transaction.groupName,
    activityType: transaction.activityType,
  };

  async function handleSubmit(
    values: UpdateTransactionInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await updateTransactionAction(id, values);
    if (!result.errors) {
      redirect("/dashboard");
    }
    return result;
  }

  async function handleDelete(): Promise<{ error?: string }> {
    "use server";
    const result = await deleteTransactionAction(id);
    if (!result.error) {
      redirect("/dashboard");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">取引を編集</h1>
        <DeleteTransactionButton onDelete={handleDelete} />
      </div>
      <TransactionForm
        mode="edit"
        initialValues={initialValues}
        categories={categories}
        paymentMethods={paymentMethods}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
