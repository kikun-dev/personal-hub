"use client";

import { useState } from "react";
import type { ValidationError } from "@/types/errors";
import {
  PERSON_ROLE_LABELS,
  PERSON_ROLE_VALUES,
  type CreatePersonInput,
  type PersonRole,
} from "@/types/person";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type PersonFormProps = {
  mode: "create" | "edit";
  initialValues?: CreatePersonInput;
  onSubmit: (
    values: CreatePersonInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

function getDefaultValues(): CreatePersonInput {
  return {
    displayName: "",
    dateOfBirth: "",
    roles: [],
    biography: "",
  };
}

export function PersonForm({
  mode,
  initialValues,
  onSubmit,
}: PersonFormProps) {
  const [values, setValues] = useState<CreatePersonInput>(
    () => initialValues ?? getDefaultValues()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof CreatePersonInput>(
    field: K,
    value: CreatePersonInput[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const toggleRole = (role: PersonRole) => {
    setValues((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.roles;
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
        id="displayName"
        label="名前*"
        value={values.displayName}
        onChange={(e) => update("displayName", e.target.value)}
        error={errors.displayName}
      />

      <Input
        id="dateOfBirth"
        label="生年月日"
        type="date"
        value={values.dateOfBirth}
        onChange={(e) => update("dateOfBirth", e.target.value)}
        error={errors.dateOfBirth}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70">
          担当*
        </label>
        {errors.roles && <p className="mb-1 text-xs text-red-500">{errors.roles}</p>}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-foreground/10 p-3 sm:grid-cols-3">
          {PERSON_ROLE_VALUES.map((role) => (
            <label
              key={role}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-foreground/5"
            >
              <input
                type="checkbox"
                checked={values.roles.includes(role)}
                onChange={() => toggleRole(role)}
                className="rounded"
              />
              <span className="text-foreground">{PERSON_ROLE_LABELS[role]}</span>
            </label>
          ))}
        </div>
      </div>

      <Textarea
        id="biography"
        label="略歴"
        value={values.biography}
        onChange={(e) => update("biography", e.target.value)}
        error={errors.biography}
      />

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "保存中..." : mode === "create" ? "登録する" : "更新する"}
      </Button>
    </form>
  );
}
