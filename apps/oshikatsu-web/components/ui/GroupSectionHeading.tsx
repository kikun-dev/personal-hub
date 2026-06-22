type GroupSectionHeadingProps = {
  color: string;
  name: string;
};

export function GroupSectionHeading({ color, name }: GroupSectionHeadingProps) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span
        aria-hidden="true"
        className="h-5 w-1 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{name}</span>
    </h2>
  );
}
