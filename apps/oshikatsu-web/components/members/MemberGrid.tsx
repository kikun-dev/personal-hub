import type { MemberWithGroups } from "@/types/member";
import { MemberCard } from "./MemberCard";

type MemberGridProps = {
  members: MemberWithGroups[];
};

export function MemberGrid({ members }: MemberGridProps) {
  if (members.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-foreground/50">
        メンバーが見つかりません
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <MemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}
