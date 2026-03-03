"use client";

import { useState } from "react";
import type { Category } from "@/types/category";
import type { PaymentMethod } from "@/types/paymentMethod";
import type { CreateTransactionInput } from "@/types/transaction";
import type { ValidationError } from "@/types/errors";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { OshikatsuFields } from "@/components/transactions/OshikatsuFields";

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
    amount: 0,
    categoryId: null,
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

  const expenseCategories = categories.filter((c) => c.type === "expense");

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

  const handleOshikatsuToggle = (enabled: boolean) => {
    setValues((prev) => ({
      ...prev,
      isOshikatsu: enabled,
      categoryId: enabled ? null : "",
      groupName: enabled ? prev.groupName : null,
      activityType: enabled ? prev.activityType : null,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      if (enabled) {
        delete next.categoryId;
      } else {
        delete next.groupName;
        delete next.activityType;
      }
      return next;
    });
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
      {/* 汎用エラー */}
      {errors._form && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {errors._form}
        </p>
      )}

      {/* 推し活トグル */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground/70">
          推し活
        </span>
        <button
          type="button"
          onClick={() => handleOshikatsuToggle(!values.isOshikatsu)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            values.isOshikatsu
              ? "bg-purple-500"
              : "bg-foreground/10"
          }`}
          role="switch"
          aria-checked={values.isOshikatsu}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform ${
              values.isOshikatsu ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* 推し活フィールド or カテゴリ */}
      {values.isOshikatsu ? (
        <OshikatsuFields
          groupName={values.groupName}
          activityType={values.activityType}
          onGroupNameChange={(v) => update("groupName", v)}
          onActivityTypeChange={(v) => update("activityType", v)}
          errors={{
            groupName: errors.groupName,
            activityType: errors.activityType,
          }}
        />
      ) : (
        <Select
          id="categoryId"
          label="カテゴリ"
          placeholder="選択してください"
          options={expenseCategories.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
          value={values.categoryId ?? ""}
          onChange={(e) => update("categoryId", e.target.value || null)}
          error={errors.categoryId}
        />
      )}

      {/* 日付 */}
      <Input
        id="date"
        label="日付"
        type="date"
        value={values.date}
        onChange={(e) => update("date", e.target.value)}
        error={errors.date}
      />

      {/* 支払い方法 */}
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
