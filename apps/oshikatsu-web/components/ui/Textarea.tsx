import { type TextareaHTMLAttributes, useId } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export function Textarea({
  label,
  error,
  id,
  className = "",
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;
  const describedBy = error
    ? [ariaDescribedBy, errorId].filter(Boolean).join(" ")
    : ariaDescribedBy;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-foreground/70">
        {label}
      </label>
      <textarea
        id={fieldId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/20 ${
          error ? "border-red-400" : "border-foreground/10"
        } ${className}`}
        rows={3}
        {...props}
      />
      {error && <p id={errorId} className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
