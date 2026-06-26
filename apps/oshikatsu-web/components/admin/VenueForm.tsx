"use client";

import { useState } from "react";
import type { ValidationError } from "@/types/errors";
import type { CreateVenueInput } from "@/types/venue";
import { PREFECTURES, isPrefecture } from "@/lib/prefectures";
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

const OVERSEAS_VALUE = "__overseas__";
const inputClass =
  "w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/20";

function getDefaultValues(): CreateVenueInput {
  return {
    name: "",
    prefecture: "",
    capacity: "",
    mapUrl: "",
    officialUrl: "",
    access: "",
    notes: "",
  };
}

export function VenueForm({ mode, initialValues, onSubmit }: VenueFormProps) {
  const [values, setValues] = useState<CreateVenueInput>(
    () => initialValues ?? getDefaultValues()
  );
  // 都道府県が空でなく47に無い＝海外（地域名手入力）
  const [isOverseas, setIsOverseas] = useState(
    () => values.prefecture !== "" && !isPrefecture(values.prefecture)
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

  const handlePrefectureSelect = (selected: string) => {
    if (selected === OVERSEAS_VALUE) {
      setIsOverseas(true);
      update("prefecture", "");
    } else {
      setIsOverseas(false);
      update("prefecture", selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 「海外」選択時は国・地域名の入力を必須にする
    // （CreateVenueInput だけでは「未選択」と「海外選択・未入力」を区別できないためUI側で担保）
    if (isOverseas && !values.prefecture.trim()) {
      setErrors({ prefecture: "国・地域名を入力してください" });
      return;
    }

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

  const selectValue = isOverseas
    ? OVERSEAS_VALUE
    : isPrefecture(values.prefecture)
      ? values.prefecture
      : "";

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

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground/70">
          都道府県
        </label>
        <select
          value={selectValue}
          onChange={(e) => handlePrefectureSelect(e.target.value)}
          className={inputClass}
        >
          <option value="">未選択</option>
          {PREFECTURES.map((prefecture) => (
            <option key={prefecture} value={prefecture}>
              {prefecture}
            </option>
          ))}
          <option value={OVERSEAS_VALUE}>海外</option>
        </select>
        {isOverseas && (
          <input
            value={values.prefecture}
            onChange={(e) => update("prefecture", e.target.value)}
            placeholder="国・地域名（例: 台湾）"
            className={`mt-2 ${inputClass}`}
          />
        )}
        {errors.prefecture && (
          <p className="mt-1 text-xs text-red-500">{errors.prefecture}</p>
        )}
      </div>

      <Input
        id="capacity"
        label="キャパシティ"
        type="number"
        inputMode="numeric"
        value={values.capacity}
        onChange={(e) => update("capacity", e.target.value)}
        error={errors.capacity}
      />

      <Input
        id="mapUrl"
        label="Googleマップのリンク"
        value={values.mapUrl}
        onChange={(e) => update("mapUrl", e.target.value)}
        error={errors.mapUrl}
      />

      <Input
        id="officialUrl"
        label="公式サイトのリンク"
        value={values.officialUrl}
        onChange={(e) => update("officialUrl", e.target.value)}
        error={errors.officialUrl}
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
