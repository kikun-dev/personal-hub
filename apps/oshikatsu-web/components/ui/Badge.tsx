type BadgeProps = {
  label: string;
  color?: string;
  className?: string;
};

export function Badge({ label, color, className = "" }: BadgeProps) {
  // DB / domain の category color を保ちつつ、light / dark 双方で背景と文字を
  // semantic token 側へ寄せる。旧 `${color}20` のalpha surfaceと違い、背後の
  // surfaceに結果が左右されず、category hueを残したまま文字contrastを安定させる。
  const colorStyle = color
    ? {
        backgroundColor: `color-mix(in oklch, ${color} 24%, var(--background))`,
        color: `color-mix(in oklch, ${color} 38%, var(--foreground))`,
      }
    : undefined;

  return (
    <span
      data-ui="badge"
      data-colorized={color ? "true" : "false"}
      className={`inline-flex max-w-full shrink-0 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-surface-selected px-2 py-0.5 text-[10px] font-semibold leading-[1.55] text-foreground ${className}`}
      style={colorStyle}
    >
      {label}
    </span>
  );
}
