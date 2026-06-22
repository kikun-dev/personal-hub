import { MemberGrid } from "@/components/members/MemberGrid";
import { GroupSectionHeading } from "@/components/ui/GroupSectionHeading";
import type { MemberSection } from "@/types/member";

type MemberSectionListProps = {
  sections: MemberSection[];
};

export function MemberSectionList({ sections }: MemberSectionListProps) {
  if (sections.length === 0) {
    return <MemberGrid members={[]} />;
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section
          key={section.group?.id ?? "ungrouped"}
          className="space-y-3"
        >
          <GroupSectionHeading
            color={section.group?.color}
            name={section.group?.nameJa ?? "未所属"}
          />
          <MemberGrid members={section.members} />
        </section>
      ))}
    </div>
  );
}
