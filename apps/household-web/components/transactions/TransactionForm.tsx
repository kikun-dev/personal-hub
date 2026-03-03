"use client";

import { useState } from "react";
import type { Category } from "@/types/category";
import type { PaymentMethod } from "@/types/paymentMethod";
import type { CreateTransactionInput } from "@/types/transaction";
import type { ValidationError } from "@/types/errors";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

type TransactionFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateTransactionInput;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  onSubmit: (
    values: CreateTransactionInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultValues(): CreateTransactionInput {
  return {
    date: getLocalDateString(),
    type: "expense",
    amount: 0,
    categoryId: "",
    paymentMethodId: null,
    memo: "",
    isOshikatsu: false,
    groupName: null,
    activityType: null,
  };
}

export function TransactionForm({
  mode,
  initialValues,
  categories,
  paymentMethods,
  onSubmit,
}: TransactionFormProps) {
  const [values, setValues] = useState<CreateTransactionInput>(
    () => initialValues ?? getDefaultValues()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === values.type);

  const update = <K extends keyof CreateTransactionInput>(
    field: K,
    value: CreateTransactionInput[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleTypeChange = (type: "income" | "expense") => {
    setValues((prev) => ({
      ...prev,
      type,
      categoryId: "",
      paymentMethodId: null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await onSubmit(values);

      if (result.errors) {
        const errorMap: Record<string, string> = {};
        for (const err of result.errors) {
          errorMap[err.field] = err.message;
        }
        setErrors(errorMap);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 収入/支出切替 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleTypeChange("expense")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            values.type === "expense"
              ? "bg-red-500 text-white"
              : "bg-foreground/5 text-foreground/60"
          }`}
        >
          支出
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("income")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
            values.type === "income"
              ? "bg-green-600 text-white"
              : "bg-foreground/5 text-foreground/60"
          }`}
        >
          収入
        </button>
      </div>

      {/* 金額 */}
      <Input
        id="amount"
        label="金額"
        type="number"
        min={1}
        placeholder="0"
        value={values.amount || ""}
        onChange={(e) => update("amount", Number(e.target.value))}
        error={errors.amount}
      />

      {/* 日付 */}
      <Input
        id="date"
        label="日付"
        type="date"
        value={values.date}
        onChange={(e) => update("date", e.target.value)}
        error={errors.date}
      />

      {/* カテゴリ */}
      <Select
        id="categoryId"
        label="カテゴリ"
        placeholder="選択してください"
        options={filteredCategories.map((c) => ({
          value: c.id,
          label: c.name,
        }))}
        value={values.categoryId}
        onChange={(e) => update("categoryId", e.target.value)}
        error={errors.categoryId}
      />

      {/* 支払い方法 */}
      {values.type === "expense" && (
        <Select
          id="paymentMethodId"
          label="支払い方法"
          placeholder="選択してください"
          options={paymentMethods.map((p) => ({
            value: p.id,
            label: p.name,
          }))}
          value={values.paymentMethodId ?? ""}
          onChange={(e) =>
            update("paymentMethodId", e.target.value || null)
          }
          error={errors.paymentMethodId}
        />
      )}

      {/* メモ */}
      <Input
        id="memo"
        label="メモ"
        type="text"
        placeholder="任意"
        value={values.memo}
        onChange={(e) => update("memo", e.target.value)}
      />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? "保存中..."
          : mode === "create"
            ? "登録する"
            : "更新する"}
      </Button>
    </form>
  );
}
