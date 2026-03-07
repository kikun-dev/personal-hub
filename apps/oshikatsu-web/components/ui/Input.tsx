"use client";

import { type InputHTMLAttributes, useRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const inputClassName = `w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
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
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-foreground/70">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            {...dateProps}
            id={id}
            placeholder={placeholder ?? "YYYY-MM-DD"}
            className={inputClassName}
            value={dateValue}
            onChange={onChange}
            type="text"
          />
          <button
            type="button"
            onClick={openPicker}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${
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
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-foreground/70">
        {label}
      </label>
      <input
        id={id}
        className={inputClassName}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
