import type { CreateTransactionInput } from "@/types/transaction";
import type { ValidationError } from "@/types/errors";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const [y, m, d] = value.split("-").map(Number);
  return (
    parsed.getFullYear() === y &&
    parsed.getMonth() + 1 === m &&
    parsed.getDate() === d
  );
}

export function validateTransaction(
  input: CreateTransactionInput
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.date) {
    errors.push({ field: "date", message: "日付を選択してください" });
  } else if (!isValidDate(input.date)) {
    errors.push({ field: "date", message: "有効な日付を入力してください" });
  }

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    errors.push({ field: "amount", message: "金額は1円以上の整数で入力してください" });
  }

  if (!input.isOshikatsu && !input.categoryId) {
    errors.push({ field: "categoryId", message: "カテゴリを選択してください" });
  }

  if (input.isOshikatsu && !input.groupName) {
    errors.push({ field: "groupName", message: "推しグループを選択してください" });
  }

  if (input.isOshikatsu && !input.activityType) {
    errors.push({ field: "activityType", message: "活動タイプを選択してください" });
  }

  return errors;
}
