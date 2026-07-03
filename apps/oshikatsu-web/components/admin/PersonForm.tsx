"use client";

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
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import { useAdminForm } from "@/hooks/useAdminForm";

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
  const { values, setValues, update, errors, setErrors, isSubmitting, handleSubmit } =
    useAdminForm<CreatePersonInput>({
      initialValues: () => initialValues ?? getDefaultValues(),
      onSubmit,
    });

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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormErrorBanner message={errors._form} />

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
