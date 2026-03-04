import Link from "next/link";
import type { MemberWithGroups } from "@/types/member";
import { GroupBadge } from "@/components/ui/GroupBadge";

type MemberCardProps = {
  member: MemberWithGroups;
};

export function MemberCard({ member }: MemberCardProps) {
  const isActive = member.groups.some((g) => g.graduatedAt === null);

  return (
    <Link
      href={`/members/${member.id}`}
      className="block rounded-lg border border-foreground/10 bg-background p-4 transition-colors hover:bg-foreground/5"
    >
      <div className="flex items-start gap-3">
        {member.imageUrl ? (
          <img
            src={member.imageUrl}
            alt={member.nameJa}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5 text-lg font-bold text-foreground/30">
            {member.nameJa.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {member.nameJa}
            </span>
            {!isActive && (
              <span className="text-xs text-foreground/40">卒業</span>
            )}
          </div>
          <p className="text-xs text-foreground/50">{member.nameKana}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {member.groups.map((g) => (
              <GroupBadge
                key={g.id}
                groupName={g.groupNameJa}
                groupColor={g.groupColor}
                generation={g.generation}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
