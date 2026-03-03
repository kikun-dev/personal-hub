import type { CreateTransactionInput } from "@/types/transaction";
import type { ValidationError } from "@/types/errors";

export function validateTransaction(
  input: CreateTransactionInput
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.type !== "income" && input.type !== "expense") {
    errors.push({ field: "type", message: "収入または支出を選択してください" });
  }

  if (!input.date) {
    errors.push({ field: "date", message: "日付を選択してください" });
  }

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    errors.push({ field: "amount", message: "金額は1円以上の整数で入力してください" });
  }

  if (!input.categoryId) {
    errors.push({ field: "categoryId", message: "カテゴリを選択してください" });
  }

  if (input.isOshikatsu && !input.groupName) {
    errors.push({ field: "groupName", message: "推しグループ名を入力してください" });
  }

  if (input.isOshikatsu && !input.activityType) {
    errors.push({ field: "activityType", message: "活動タイプを選択してください" });
  }

  return errors;
}
