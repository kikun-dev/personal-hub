import Image from "next/image";
import type { ReactNode } from "react";
import type { MemberWithGroups } from "@/types/member";
import { GroupBadge } from "@/components/ui/GroupBadge";
import { Card } from "@/components/ui/Card";
import { formatBirthday, calculateAge, formatDate } from "@/lib/formatters";
import { resolveMemberImageSrc } from "@/lib/memberImage";

type MemberProfileProps = {
  member: MemberWithGroups;
  mainGroupPenlightColorNames?: string[];
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

function toUtcDate(dateString: string): Date | null {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function getTodayInJst(): string {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jstNow.toISOString().slice(0, 10);
}

function calculateTenureDays(joinedAt: string | null, graduatedAt: string | null): number | null {
  if (!joinedAt) return null;
  const startDate = toUtcDate(joinedAt);
  const endDate = toUtcDate(graduatedAt ?? getTodayInJst());
  if (!startDate || !endDate) return null;

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return null;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function linkifyNote(note: string): ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = note.split(urlRegex);

  return parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function MemberProfile({
  member,
  mainGroupPenlightColorNames = [],
}: MemberProfileProps) {
  const age = member.dateOfBirth ? calculateAge(member.dateOfBirth) : null;
  const imageSrc = resolveMemberImageSrc(member.imageUrl);
  const orderedPenlightColors = mainGroupPenlightColorNames;
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
        {imageSrc ? (
          <Image
            src={imageSrc}
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
        {member.memo && (
          <div className="mt-3 border-t border-foreground/10 pt-3">
            <h3 className="text-sm text-foreground/50">メモ</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{member.memo}</p>
          </div>
        )}
      </Card>

      {/* グループ履歴 */}
      <Card>
        <h2 className="mb-3 text-sm font-medium text-foreground/70">グループ履歴</h2>
        <div className="space-y-2">
          {member.groups.map((g) => {
            const tenureDays = calculateTenureDays(g.joinedAt, g.graduatedAt);
            return (
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
                <div className="text-right text-foreground/50">
                  <p>
                    {g.joinedAt && formatDate(g.joinedAt)}
                    {g.joinedAt && " 〜 "}
                    {g.graduatedAt ? formatDate(g.graduatedAt) : "現役"}
                  </p>
                  {tenureDays !== null && <p className="text-xs">在籍{tenureDays}日</p>}
                </div>
              </div>
            );
          })}
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

      {/* 来歴 */}
      {member.histories.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-medium text-foreground/70">来歴</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-foreground/10 text-foreground/50">
                  <th className="px-2 py-2 font-medium">日付</th>
                  <th className="px-2 py-2 font-medium">出来事</th>
                  <th className="px-2 py-2 font-medium">備考</th>
                </tr>
              </thead>
              <tbody>
                {member.histories.map((history) => (
                  <tr key={history.id} className="border-b border-foreground/10 align-top">
                    <td className="px-2 py-2 whitespace-nowrap text-foreground/70">
                      {formatDate(history.date)}
                    </td>
                    <td className="px-2 py-2 text-foreground">{history.event}</td>
                    <td className="px-2 py-2 whitespace-pre-wrap text-foreground/70">
                      {history.note ? linkifyNote(history.note) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
