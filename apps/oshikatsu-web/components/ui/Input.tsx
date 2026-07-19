"use client";

import { type InputHTMLAttributes, useId, useRef } from "react";
import { focusRingClass } from "@/components/ui/focusRing";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({
  label,
  error,
  id,
  className = "",
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const describedBy = error
    ? [ariaDescribedBy, errorId].filter(Boolean).join(" ")
    : ariaDescribedBy;
  // エラー時は内部契約を優先し、それ以外は呼び出し側の指定を維持する
  const invalid = error ? ("true" as const) : ariaInvalid;
  const inputClassName = `w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 ${focusRingClass} ${
    error ? "border-red-400" : "border-foreground/10"
  } ${className}`;

  if (props.type === "date") {
    const { onChange, value, placeholder, min, max, ...dateProps } = props;
    const dateValue = typeof value === "string" ? value : "";

    const openPicker = () => {
      const picker = pickerRef.current;
      if (!picker) return;
      if (typeof picker.showPicker === "function") {
        picker.showPicker();
        return;
      }
      picker.click();
    };

    return (
      <div>
        <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-foreground/70">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            {...dateProps}
            id={fieldId}
            placeholder={placeholder ?? "YYYY-MM-DD"}
            className={inputClassName}
            value={dateValue}
            onChange={onChange}
            type="text"
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
          <button
            type="button"
            onClick={openPicker}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${focusRingClass} ${
              error
                ? "border-red-400 text-red-500"
                : "border-foreground/10 text-foreground/70 hover:bg-foreground/5"
            }`}
            aria-label={`${label}をカレンダーから選択`}
          >
            選択
          </button>
          <input
            ref={pickerRef}
            type="date"
            value={dateValue}
            min={min}
            max={max}
            disabled={dateProps.disabled}
            onChange={onChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
        {error && <p id={errorId} className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-foreground/70">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={inputClassName}
        {...props}
      />
      {error && <p id={errorId} className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
