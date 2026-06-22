type GroupSectionHeadingProps = {
  color?: string;
  name: string;
};

const DEFAULT_GROUP_SECTION_COLOR = "#9ca3af";

export function GroupSectionHeading({ color, name }: GroupSectionHeadingProps) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span
        aria-hidden="true"
        className="h-5 w-1 rounded-full"
        style={{ backgroundColor: color ?? DEFAULT_GROUP_SECTION_COLOR }}
      />
      <span>{name}</span>
    </h2>
  );
}
