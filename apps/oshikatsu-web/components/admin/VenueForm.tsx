"use client";

import { useState } from "react";
import type { ValidationError } from "@/types/errors";
import type { CreateVenueInput } from "@/types/venue";
import { PREFECTURES, isPrefecture } from "@/lib/prefectures";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import { useAdminForm } from "@/hooks/useAdminForm";

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

function resolveInitialValues(
  initialValues?: CreateVenueInput
): CreateVenueInput {
  return initialValues ?? getDefaultValues();
}

export function VenueForm({ mode, initialValues, onSubmit }: VenueFormProps) {
  // 都道府県が空でなく47に無い＝海外（地域名手入力）
  const [isOverseas, setIsOverseas] = useState(() => {
    const initial = resolveInitialValues(initialValues);
    return initial.prefecture !== "" && !isPrefecture(initial.prefecture);
  });

  const { values, update, errors, isSubmitting, handleSubmit } =
    useAdminForm<CreateVenueInput>({
      initialValues: () => resolveInitialValues(initialValues),
      onSubmit,
      // 「海外」選択時は国・地域名の入力を必須にする
      // （CreateVenueInput だけでは「未選択」と「海外選択・未入力」を区別できないためUI側で担保）
      validate: (formValues) => {
        if (isOverseas && !formValues.prefecture.trim()) {
          return { prefecture: "国・地域名を入力してください" };
        }
        return null;
      },
    });

  const handlePrefectureSelect = (selected: string) => {
    if (selected === OVERSEAS_VALUE) {
      setIsOverseas(true);
      update("prefecture", "");
    } else {
      setIsOverseas(false);
      update("prefecture", selected);
    }
  };

  const selectValue = isOverseas
    ? OVERSEAS_VALUE
    : isPrefecture(values.prefecture)
      ? values.prefecture
      : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormErrorBanner message={errors._form} />

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
