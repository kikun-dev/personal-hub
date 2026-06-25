"use client";

import { useState } from "react";
import type { ValidationError } from "@/types/errors";
import type { CreateVenueInput } from "@/types/venue";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type VenueFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateVenueInput;
  onSubmit: (
    values: CreateVenueInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

function getDefaultValues(): CreateVenueInput {
  return {
    name: "",
    prefecture: "",
    address: "",
    capacity: "",
    access: "",
    notes: "",
  };
}

export function VenueForm({ mode, initialValues, onSubmit }: VenueFormProps) {
  const [values, setValues] = useState<CreateVenueInput>(
    () => initialValues ?? getDefaultValues()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof CreateVenueInput>(
    field: K,
    value: CreateVenueInput[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
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
      {errors._form && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {errors._form}
        </p>
      )}

      <Input
        id="name"
        label="会場名*"
        value={values.name}
        onChange={(e) => update("name", e.target.value)}
        error={errors.name}
      />

      <Input
        id="prefecture"
        label="都道府県"
        value={values.prefecture}
        onChange={(e) => update("prefecture", e.target.value)}
        error={errors.prefecture}
      />

      <Input
        id="address"
        label="住所"
        value={values.address}
        onChange={(e) => update("address", e.target.value)}
        error={errors.address}
      />

      <Input
        id="capacity"
        label="キャパシティ"
        type="number"
        inputMode="numeric"
        value={values.capacity}
        onChange={(e) => update("capacity", e.target.value)}
        error={errors.capacity}
      />

      <Textarea
        id="access"
        label="交通情報"
        value={values.access}
        onChange={(e) => update("access", e.target.value)}
        error={errors.access}
      />

      <Textarea
        id="notes"
        label="メモ"
        value={values.notes}
        onChange={(e) => update("notes", e.target.value)}
        error={errors.notes}
      />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "保存中..." : mode === "create" ? "登録する" : "更新する"}
      </Button>
    </form>
  );
}
