import { type SelectHTMLAttributes, useId } from "react";
import { focusRingClass } from "@/components/ui/focusRing";

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
};

export function Select({
  label,
  options,
  placeholder,
  error,
  id,
  className = "",
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const describedBy = error
    ? [ariaDescribedBy, errorId].filter(Boolean).join(" ")
    : ariaDescribedBy;
  // エラー時は内部契約を優先し、それ以外は呼び出し側の指定を維持する
  const invalid = error ? ("true" as const) : ariaInvalid;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-foreground/70">
        {label}
      </label>
      <select
        id={fieldId}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground ${focusRingClass} ${
          error ? "border-red-400" : "border-foreground/10"
        } ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p id={errorId} className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
