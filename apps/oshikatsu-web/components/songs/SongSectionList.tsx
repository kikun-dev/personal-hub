import { SongGrid } from "@/components/songs/SongGrid";
import { GroupSectionHeading } from "@/components/ui/GroupSectionHeading";
import type { SongSection } from "@/types/song";

type SongSectionListProps = {
  sections: SongSection[];
};

export function SongSectionList({ sections }: SongSectionListProps) {
  if (sections.length === 0) {
    return <SongGrid songs={[]} />;
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section
          key={section.group?.id ?? "ungrouped"}
          className="space-y-3"
        >
          <GroupSectionHeading
            color={section.group?.color ?? "#9ca3af"}
            name={section.group?.nameJa ?? "未所属"}
          />
          <SongGrid songs={section.songs} />
        </section>
      ))}
    </div>
  );
}
