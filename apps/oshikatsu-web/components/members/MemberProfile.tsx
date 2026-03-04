import Image from "next/image";
import type { MemberWithGroups } from "@/types/member";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { Card } from "@/components/ui/Card";
import { formatBirthday, calculateAge, formatDate } from "@/lib/formatters";

type MemberProfileProps = {
  member: MemberWithGroups;
};

export function MemberProfile({ member }: MemberProfileProps) {
  const age = member.dateOfBirth ? calculateAge(member.dateOfBirth) : null;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start gap-4">
        {member.imageUrl ? (
          <Image
            src={member.imageUrl}
            alt={member.nameJa}
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-foreground/5 text-2xl font-bold text-foreground/30">
            {member.nameJa.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground">{member.nameJa}</h1>
          <p className="text-sm text-foreground/50">{member.nameKana}</p>
          {member.nameEn && (
            <p className="text-sm text-foreground/50">{member.nameEn}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
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

      {/* プロフィール */}
      <Card>
        <h2 className="mb-3 text-sm font-medium text-foreground/70">プロフィール</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {member.dateOfBirth && (
            <>
              <dt className="text-foreground/50">生年月日</dt>
              <dd className="text-foreground">
                {formatBirthday(member.dateOfBirth)}
                {age !== null && ` (${age}歳)`}
              </dd>
            </>
          )}
          {member.bloodType && (
            <>
              <dt className="text-foreground/50">血液型</dt>
              <dd className="text-foreground">{member.bloodType}型</dd>
            </>
          )}
          {member.heightCm && (
            <>
              <dt className="text-foreground/50">身長</dt>
              <dd className="text-foreground">{member.heightCm}cm</dd>
            </>
          )}
          {member.hometown && (
            <>
              <dt className="text-foreground/50">出身地</dt>
              <dd className="text-foreground">{member.hometown}</dd>
            </>
          )}
        </dl>
      </Card>

      {/* グループ履歴 */}
      <Card>
        <h2 className="mb-3 text-sm font-medium text-foreground/70">グループ履歴</h2>
        <div className="space-y-2">
          {member.groups.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <GroupBadge
                  groupName={g.groupNameJa}
                  groupColor={g.groupColor}
                  generation={g.generation}
                />
              </div>
              <div className="text-foreground/50">
                {g.joinedAt && formatDate(g.joinedAt)}
                {g.joinedAt && " 〜 "}
                {g.graduatedAt ? formatDate(g.graduatedAt) : "現役"}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 外部リンク */}
      {member.blogUrl && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">リンク</h2>
          <a
            href={member.blogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:underline"
          >
            ブログ
          </a>
        </Card>
      )}
    </div>
  );
}
