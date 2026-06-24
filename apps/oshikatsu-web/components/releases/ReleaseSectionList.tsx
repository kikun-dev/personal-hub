import { ReleaseGrid } from "@/components/releases/ReleaseGrid";
import { GroupSectionHeading } from "@/components/ui/GroupSectionHeading";
import type { ReleaseSection } from "@/types/release";

type ReleaseSectionListProps = {
  sections: ReleaseSection[];
};

export function ReleaseSectionList({ sections }: ReleaseSectionListProps) {
  if (sections.length === 0) {
    return <ReleaseGrid releases={[]} />;
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.group?.id ?? "ungrouped"} className="space-y-3">
          <GroupSectionHeading
            color={section.group?.color}
            name={section.group?.nameJa ?? "その他"}
          />
          <ReleaseGrid releases={section.releases} showGroupName={false} />
        </section>
      ))}
    </div>
  );
}
