type BadgeProps = {
  label: string;
  color?: string;
  className?: string;
};

export function Badge({ label, color, className = "" }: BadgeProps) {
  return (
    <span
      data-ui="badge"
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-surface-subtle px-2.5 py-0.5 text-xs font-medium text-foreground ${className}`}
      style={
        color
          ? { backgroundColor: `${color}20` }
          : undefined
      }
    >
      {label}
    </span>
  );
}
