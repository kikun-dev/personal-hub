"use client";

import { useState } from "react";
import type { Group } from "@/types/group";
import type { CreateMemberInput, CreateMemberGroupInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { BLOOD_TYPES } from "@/lib/constants";

type GroupWithKey = CreateMemberGroupInput & { _key: string };

type FormValues = Omit<CreateMemberInput, "groups"> & {
  groups: GroupWithKey[];
};

type MemberFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateMemberInput;
  groups: Group[];
  onSubmit: (
    values: CreateMemberInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

function withKey(group: CreateMemberGroupInput): GroupWithKey {
  return { ...group, _key: crypto.randomUUID() };
}

function getDefaultValues(): FormValues {
  return {
    nameJa: "",
    nameKana: "",
    nameEn: "",
    dateOfBirth: "",
    bloodType: "",
    heightCm: "",
    hometown: "",
    imageUrl: "",
    blogUrl: "",
    groups: [withKey({ groupId: "", generation: "", joinedAt: "", graduatedAt: "" })],
  };
}

function toFormValues(input: CreateMemberInput): FormValues {
  return {
    ...input,
    groups: input.groups.map(withKey),
  };
}

function toSubmitValues(form: FormValues): CreateMemberInput {
  return {
    ...form,
    groups: form.groups.map((g) => ({
    groupId: g.groupId,
    generation: g.generation,
    joinedAt: g.joinedAt,
    graduatedAt: g.graduatedAt,
  })),
  };
}

export function MemberForm({
  mode,
  initialValues,
  groups,
  onSubmit,
}: MemberFormProps) {
  const [values, setValues] = useState<FormValues>(
    () => initialValues ? toFormValues(initialValues) : getDefaultValues()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof FormValues>(
    field: K,
    value: FormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateGroup = (
    index: number,
    field: keyof CreateMemberGroupInput,
    value: string
  ) => {
    setValues((prev) => {
      const newGroups = [...prev.groups];
      newGroups[index] = { ...newGroups[index], [field]: value };
      return { ...prev, groups: newGroups };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`groups.${index}.${field}`];
      delete next["groups"];
      return next;
    });
  };

  const addGroup = () => {
    setValues((prev) => ({
      ...prev,
      groups: [
        ...prev.groups,
        withKey({ groupId: "", generation: "", joinedAt: "", graduatedAt: "" }),
      ],
    }));
  };

  const removeGroup = (index: number) => {
    setValues((prev) => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await onSubmit(toSubmitValues(values));
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
        id="nameJa"
        label="名前（日本語）*"
        value={values.nameJa}
        onChange={(e) => update("nameJa", e.target.value)}
        error={errors.nameJa}
      />

      <Input
        id="nameKana"
        label="名前（かな）*"
        value={values.nameKana}
        onChange={(e) => update("nameKana", e.target.value)}
        error={errors.nameKana}
      />

      <Input
        id="nameEn"
        label="名前（英語）"
        value={values.nameEn}
        onChange={(e) => update("nameEn", e.target.value)}
      />

      <Input
        id="dateOfBirth"
        label="生年月日"
        type="date"
        value={values.dateOfBirth}
        onChange={(e) => update("dateOfBirth", e.target.value)}
      />

      <Select
        id="bloodType"
        label="血液型"
        placeholder="選択してください"
        options={BLOOD_TYPES.map((bt) => ({ value: bt, label: `${bt}型` }))}
        value={values.bloodType}
        onChange={(e) => update("bloodType", e.target.value)}
      />

      <Input
        id="heightCm"
        label="身長 (cm)"
        type="number"
        value={values.heightCm}
        onChange={(e) => update("heightCm", e.target.value)}
        error={errors.heightCm}
      />

      <Input
        id="hometown"
        label="出身地"
        value={values.hometown}
        onChange={(e) => update("hometown", e.target.value)}
      />

      <Input
        id="imageUrl"
        label="画像 URL"
        type="url"
        value={values.imageUrl}
        onChange={(e) => update("imageUrl", e.target.value)}
      />

      <Input
        id="blogUrl"
        label="ブログ URL"
        type="url"
        value={values.blogUrl}
        onChange={(e) => update("blogUrl", e.target.value)}
      />

      {/* グループ所属 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground/70">
            グループ所属*
          </label>
          <Button type="button" variant="ghost" onClick={addGroup}>
            + 追加
          </Button>
        </div>
        {errors.groups && (
          <p className="text-xs text-red-500">{errors.groups}</p>
        )}

        {values.groups.map((g, i) => (
          <div
            key={g._key}
            className="space-y-3 rounded-lg border border-foreground/10 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/50">
                グループ {i + 1}
              </span>
              {values.groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGroup(i)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  削除
                </button>
              )}
            </div>
            <Select
              id={`group-${i}`}
              label="グループ"
              placeholder="選択してください"
              options={groups.map((group) => ({
                value: group.id,
                label: group.nameJa,
              }))}
              value={g.groupId}
              onChange={(e) => updateGroup(i, "groupId", e.target.value)}
              error={errors[`groups.${i}.groupId`]}
            />
            <Input
              id={`generation-${i}`}
              label="期生"
              placeholder="例: 1期生"
              value={g.generation}
              onChange={(e) => updateGroup(i, "generation", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                id={`joinedAt-${i}`}
                label="加入日"
                type="date"
                value={g.joinedAt}
                onChange={(e) => updateGroup(i, "joinedAt", e.target.value)}
              />
              <Input
                id={`graduatedAt-${i}`}
                label="卒業日"
                type="date"
                value={g.graduatedAt}
                onChange={(e) => updateGroup(i, "graduatedAt", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

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
