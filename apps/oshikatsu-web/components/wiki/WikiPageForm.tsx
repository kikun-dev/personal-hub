"use client";

import { useState } from "react";
import type { ValidationError } from "@/types/errors";
import type { CreateWikiPageInput } from "@/types/wiki";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormErrorBanner } from "@/components/ui/FormErrorBanner";
import { focusRingClass } from "@/components/ui/focusRing";
import { useAdminForm } from "@/hooks/useAdminForm";
import { WikiPageContent } from "@/components/wiki/WikiPageContent";

type WikiPageFormProps = {
  mode: "create" | "edit";
  initialValues?: CreateWikiPageInput;
  onSubmit: (
    values: CreateWikiPageInput
  ) => Promise<{ errors?: ValidationError[] }>;
};

type BodyTab = "edit" | "preview";

function getDefaultValues(): CreateWikiPageInput {
  return {
    slug: "",
    title: "",
    bodyMarkdown: "",
    sortOrder: "0",
  };
}

function resolveInitialValues(
  initialValues?: CreateWikiPageInput
): CreateWikiPageInput {
  return initialValues ?? getDefaultValues();
}

export function WikiPageForm({ mode, initialValues, onSubmit }: WikiPageFormProps) {
  const { values, update, errors, isSubmitting, handleSubmit } =
    useAdminForm<CreateWikiPageInput>({
      initialValues: () => resolveInitialValues(initialValues),
      onSubmit,
    });

  // 本文のみ「編集 / プレビュー」を切り替える（他フィールドは常に表示）。
  const [bodyTab, setBodyTab] = useState<BodyTab>("edit");

  const tabButtonClass = (tab: BodyTab) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      bodyTab === tab
        ? "bg-foreground text-background"
        : "border border-foreground/10 bg-background text-foreground/60 hover:bg-foreground/5"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormErrorBanner message={errors._form} />

      <Input
        id="title"
        label="タイトル*"
        value={values.title}
        onChange={(e) => update("title", e.target.value)}
        error={errors.title}
      />

      <Input
        id="slug"
        label="スラッグ*"
        value={values.slug}
        onChange={(e) => update("slug", e.target.value)}
        error={errors.slug}
        placeholder="例: audition-info"
      />

      <Input
        id="sortOrder"
        label="表示順"
        type="number"
        inputMode="numeric"
        value={values.sortOrder}
        onChange={(e) => update("sortOrder", e.target.value)}
        error={errors.sortOrder}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground/70">
            本文（Markdown）
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              className={tabButtonClass("edit")}
              onClick={() => setBodyTab("edit")}
            >
              編集
            </button>
            <button
              type="button"
              className={tabButtonClass("preview")}
              onClick={() => setBodyTab("preview")}
            >
              プレビュー
            </button>
          </div>
        </div>

        {bodyTab === "edit" ? (
          <textarea
            id="bodyMarkdown"
            value={values.bodyMarkdown}
            onChange={(e) => update("bodyMarkdown", e.target.value)}
            rows={20}
            className={`w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-foreground/30 ${focusRingClass} ${
              errors.bodyMarkdown ? "border-red-400" : "border-foreground/10"
            }`}
          />
        ) : (
          <div className="rounded-lg border border-foreground/10 bg-background px-4 py-3">
            {values.bodyMarkdown.trim() ? (
              <WikiPageContent bodyMarkdown={values.bodyMarkdown} />
            ) : (
              <p className="text-sm text-foreground/50">本文が空です</p>
            )}
          </div>
        )}
        {errors.bodyMarkdown && (
          <p className="mt-1 text-xs text-red-500">{errors.bodyMarkdown}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "保存中..." : mode === "create" ? "登録する" : "更新する"}
      </Button>
    </form>
  );
}
