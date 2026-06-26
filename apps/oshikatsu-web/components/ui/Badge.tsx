type BadgeProps = {
  label: string;
  color?: string;
  className?: string;
};

export function Badge({ label, color, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={
        color
          ? { backgroundColor: `${color}20`, color }
          : undefined
      }
    >
      {label}
    </span>
  );
}
