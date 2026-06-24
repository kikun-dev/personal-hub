import { MemberBrowser } from "@/components/members/MemberBrowser";
import { getMembersPageData } from "@/usecases/readOrbitData";
import type { MemberStatus } from "@/usecases/memberFilters";

type MembersPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

const MEMBER_STATUSES: MemberStatus[] = ["all", "active", "graduated"];

function toMemberStatus(value: string | undefined): MemberStatus {
  return MEMBER_STATUSES.includes(value as MemberStatus)
    ? (value as MemberStatus)
    : "active";
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const initialGroupId = params.groupId ?? "";
  const initialStatus = toMemberStatus(params.status);

  // 絞り込みはクライアント側で行うため、卒業含む全件を取得する
  const { members, groups } = await getMembersPageData({ status: "all" });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">メンバー</h1>
      <MemberBrowser
        groups={groups}
        initialGroupId={initialGroupId}
        initialStatus={initialStatus}
        members={members}
      />
    </div>
  );
}
