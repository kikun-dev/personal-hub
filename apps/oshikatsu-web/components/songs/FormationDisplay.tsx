import type { SongMember } from "@/types/song";
import { SONG_POSITIONS } from "@/lib/constants";
import { Card } from "@/components/ui/Card";

type FormationDisplayProps = {
  members: SongMember[];
};

export function FormationDisplay({ members }: FormationDisplayProps) {
  if (members.length === 0) {
    return null;
  }

  // Group members by position in SONG_POSITIONS order
  const groupedByPosition = SONG_POSITIONS.map((position) => ({
    position,
    members: members
      .filter((m) => m.position === position)
      .sort((a, b) => a.positionOrder - b.positionOrder),
  })).filter((group) => group.members.length > 0);

  if (groupedByPosition.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2 className="mb-4 text-sm font-medium text-foreground/70">
        フォーメーション
      </h2>
      <div className="space-y-4">
        {groupedByPosition.map(({ position, members: positionMembers }) => (
          <div key={position} className="space-y-1">
            {/* Position divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-foreground/10" />
              <span className="text-xs text-foreground/50">{position}</span>
              <div className="h-px flex-1 bg-foreground/10" />
            </div>
            {/* Members */}
            <p className="text-center text-sm text-foreground">
              {positionMembers.map((member, index) => (
                <span key={member.id}>
                  {index > 0 && " ・ "}
                  {member.isCenter ? (
                    <span className="font-bold">
                      ★{member.memberNameJa}★
                    </span>
                  ) : (
                    member.memberNameJa
                  )}
                </span>
              ))}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
