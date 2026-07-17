import { describe, expect, it } from "vitest";
import type { CreateTransactionInput } from "@/types/transaction";
import { validateTransaction } from "@/usecases/validateTransaction";

function makeInput(overrides: Partial<CreateTransactionInput> = {}): CreateTransactionInput {
  return {
    date: "2024-05-01",
    amount: 1000,
    categoryId: "category-1",
    paymentMethodId: "payment-1",
    memo: "",
    isOshikatsu: false,
    groupName: null,
    activityType: null,
    ...overrides,
  };
}

describe("validateTransaction", () => {
  it("日付が未入力の場合、ValidationErrorを返す", () => {
    const errors = validateTransaction(makeInput({ date: "" }));

    expect(errors).toContainEqual({ field: "date", message: "日付を選択してください" });
  });

  it("存在しない日付の場合、ValidationErrorを返す", () => {
    const errors = validateTransaction(makeInput({ date: "2024-02-30" }));

    expect(errors).toContainEqual({ field: "date", message: "有効な日付を入力してください" });
  });

  it("金額が1円未満または非整数の場合、ValidationErrorを返す", () => {
    expect(validateTransaction(makeInput({ amount: 0 }))).toContainEqual({
      field: "amount",
      message: "金額は1円以上の整数で入力してください",
    });
    expect(validateTransaction(makeInput({ amount: 100.5 }))).toContainEqual({
      field: "amount",
      message: "金額は1円以上の整数で入力してください",
    });
  });

  it("推し活以外でカテゴリ未選択の場合、ValidationErrorを返す", () => {
    const errors = validateTransaction(makeInput({ isOshikatsu: false, categoryId: null }));

    expect(errors).toContainEqual({ field: "categoryId", message: "カテゴリを選択してください" });
  });

  it("推し活で推しグループ・活動タイプ未選択の場合、ValidationErrorを返す", () => {
    const errors = validateTransaction(
      makeInput({ isOshikatsu: true, groupName: null, activityType: null })
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        { field: "groupName", message: "推しグループを選択してください" },
        { field: "activityType", message: "活動タイプを選択してください" },
      ])
    );
  });

  it("正常な入力の場合、ValidationErrorは空配列になる", () => {
    expect(validateTransaction(makeInput())).toEqual([]);
    expect(
      validateTransaction(
        makeInput({
          isOshikatsu: true,
          categoryId: null,
          groupName: "推しグループ",
          activityType: "live",
        })
      )
    ).toEqual([]);
  });
});
