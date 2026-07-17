import { type ComponentPropsWithRef } from "react";

type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "danger-ghost";
};

export function Button({
  variant = "primary",
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base =
    "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-foreground text-background hover:bg-foreground/90",
    secondary:
      "border border-border-strong bg-background text-foreground hover:bg-surface-subtle",
    danger:
      "bg-danger text-danger-foreground hover:bg-danger-hover",
    ghost:
      "text-foreground-secondary hover:bg-surface-subtle hover:text-foreground",
    // #363: danger意味を保ったまま視覚weightを下げたquiet secondary。ghostへの
    // text色上書き（競合utilityの勝敗がTailwindの生成CSS順に依存する）を避けるため
    // 独立variantとして持つ。danger textはtheme別AA token（DESIGN.md）を使う
    "danger-ghost": "text-danger-text hover:bg-surface-subtle",
  };

  return (
    <button
      data-ui="button"
      data-variant={variant}
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
