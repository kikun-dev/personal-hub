"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import type { ValidationError } from "@/types/errors";

export type UseAdminFormOptions<TValues> = {
  initialValues: TValues | (() => TValues);
  /**
   * SongForm/ReleaseForm/MemberForm のように、確認モーダルでの中断・再開や
   * 画像アップロードを含む独自の handleSubmit を持つフォームでは hook の
   * handleSubmit を使わず state 基盤のみ利用するため、onSubmit は省略できる。
   */
  onSubmit?: (values: TValues) => Promise<{ errors?: ValidationError[] }>;
  /** submit 前の UI 層バリデーション。エラーを返すと送信を中断してエラー表示する */
  validate?: (values: TValues) => Record<string, string> | null;
  /** setErrors 直後に発火するフィールドエラー通知。呼び出し側の focus 制御などに使う */
  onErrors?: (errors: Record<string, string>) => void;
};

export type UseAdminFormResult<TValues> = {
  values: TValues;
  setValues: Dispatch<SetStateAction<TValues>>;
  update: <K extends keyof TValues>(field: K, value: TValues[K]) => void;
  errors: Record<string, string>;
  setErrors: Dispatch<SetStateAction<Record<string, string>>>;
  isSubmitting: boolean;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
};

/** ValidationError[] をフィールド名をキーにしたエラーへ変換する。フォーム側の独自 handleSubmit からも再利用できるよう export する。 */
export function toErrorMap(validationErrors: ValidationError[]): Record<string, string> {
  const errorMap: Record<string, string> = {};
  for (const err of validationErrors) {
    errorMap[err.field] = err.message;
  }
  return errorMap;
}

/**
 * 管理フォーム（PersonForm / VenueForm / EventForm など）で共通の
 * values・エラー・送信状態の管理と handleSubmit を提供するフック。
 *
 * 振る舞いは各フォームの手書き実装（VenueForm 等）と同一にしている：
 * - update はフィールド更新と同時に該当フィールドのエラーをクリアする
 * - validate（UI層バリデーション）がエラーを返した場合は送信自体を行わない
 * - 送信中は isSubmitting を true にし、finally で必ず false へ戻す
 * - onSubmit が返す ValidationError[] はフィールド名をキーにしたエラーへ変換する
 */
export function useAdminForm<TValues>({
  initialValues,
  onSubmit,
  validate,
  onErrors,
}: UseAdminFormOptions<TValues>): UseAdminFormResult<TValues> {
  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof TValues>(field: K, value: TValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validate) {
      const validationErrors = validate(values);
      if (validationErrors) {
        setErrors(validationErrors);
        onErrors?.(validationErrors);
        return;
      }
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = onSubmit ? await onSubmit(values) : {};
      if (result.errors) {
        const errorMap = toErrorMap(result.errors);
        setErrors(errorMap);
        onErrors?.(errorMap);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    values,
    setValues,
    update,
    errors,
    setErrors,
    isSubmitting,
    setIsSubmitting,
    handleSubmit,
  };
}
