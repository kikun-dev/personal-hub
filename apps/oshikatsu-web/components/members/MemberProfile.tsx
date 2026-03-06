import Image from "next/image";
import type { MemberWithGroups } from "@/types/member";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { Card } from "@/components/ui/Card";
import { formatBirthday, calculateAge, formatDate } from "@/lib/formatters";
import { GROUP_PENLIGHT_COLOR_NAMES } from "@/lib/constants";

type MemberProfileProps = {
  member: MemberWithGroups;
};

const CIRCLED_NUMBERS = [
  "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩",
  "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳",
] as const;

function formatPenlightLabel(colorName: string, orderedColorNames: string[]): string {
  const index = orderedColorNames.indexOf(colorName);
  if (index === -1) return colorName;
  const prefix = CIRCLED_NUMBERS[index] ?? `${index + 1}.`;
  return `${prefix}${colorName}`;
}

export function MemberProfile({ member }: MemberProfileProps) {
  const age = member.dateOfBirth ? calculateAge(member.dateOfBirth) : null;
  const mainGroupName = member.groups[0]?.groupNameJa ?? "";
  const orderedPenlightColors = GROUP_PENLIGHT_COLOR_NAMES[mainGroupName] ?? [];
  const hasOutgoingInfo = Boolean(
    member.blogUrl ||
      member.blogHashtag ||
      member.talkAppName ||
      member.talkAppUrl ||
      member.talkAppHashtag ||
      member.sns.length > 0,
  );

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
          {member.zodiac && (
            <>
              <dt className="text-foreground/50">星座</dt>
              <dd className="text-foreground">{member.zodiac}</dd>
            </>
          )}
          {/* null: 未入力（非表示）、"不明": ユーザーが明示的に選択（表示） */}
          {member.bloodType && (
            <>
              <dt className="text-foreground/50">血液型</dt>
              <dd className="text-foreground">{member.bloodType === "不明" ? "不明" : `${member.bloodType}型`}</dd>
            </>
          )}
          {member.callName && (
            <>
              <dt className="text-foreground/50">コール名</dt>
              <dd className="text-foreground">{member.callName}</dd>
            </>
          )}
          {member.penlightColor1 && member.penlightColor2 && (
            <>
              <dt className="text-foreground/50">サイリウム</dt>
              <dd className="text-foreground">
                {formatPenlightLabel(member.penlightColor1, orderedPenlightColors)}
                {" × "}
                {formatPenlightLabel(member.penlightColor2, orderedPenlightColors)}
              </dd>
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

      {/* 発信情報 */}
      {hasOutgoingInfo && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">発信情報</h2>
          <div className="space-y-2 text-sm">
            {(member.blogUrl || member.blogHashtag) && (
              <div>
                {member.blogUrl ? (
                  <a
                    href={member.blogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-500 hover:underline"
                  >
                    ブログ
                  </a>
                ) : (
                  <p className="text-foreground">ブログ</p>
                )}
                {member.blogHashtag && (
                  <p className="text-xs text-foreground/50">{member.blogHashtag}</p>
                )}
              </div>
            )}
            {(member.talkAppName || member.talkAppUrl || member.talkAppHashtag) && (
              <div>
                {member.talkAppUrl ? (
                  <a
                    href={member.talkAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-500 hover:underline"
                  >
                    {member.talkAppName || "トークアプリ"}
                  </a>
                ) : (
                  <p className="text-foreground">{member.talkAppName || "トークアプリ"}</p>
                )}
                {member.talkAppHashtag && (
                  <p className="text-xs text-foreground/50">{member.talkAppHashtag}</p>
                )}
              </div>
            )}
            {member.sns.map((sns) => {
              const snsLabel = sns.displayName ? `${sns.displayName} (${sns.snsType})` : sns.snsType;
              return (
                <div key={sns.id}>
                  {sns.url ? (
                    <a
                      href={sns.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-500 hover:underline"
                    >
                      {snsLabel}
                    </a>
                  ) : (
                    <p className="text-foreground">{snsLabel}</p>
                  )}
                  {sns.hashtag && (
                    <p className="text-xs text-foreground/50">{sns.hashtag}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* レギュラー仕事 */}
      {member.regularWorks.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">レギュラー仕事</h2>
          <div className="space-y-2">
            {member.regularWorks.map((work) => (
              <div key={work.id} className="rounded-lg border border-foreground/10 p-3">
                <p className="text-sm font-medium text-foreground">{work.name}</p>
                <p className="text-xs text-foreground/50">{work.workType}</p>
                <p className="text-xs text-foreground/50">
                  {formatDate(work.startDate)} 〜 {work.endDate ? formatDate(work.endDate) : "継続中"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
