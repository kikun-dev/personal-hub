import { Suspense } from "react";
import { MemberGrid } from "@/components/members/MemberGrid";
import { MemberFilters } from "@/components/members/MemberFilters";
import type { MemberFilters as MemberFiltersType } from "@/types/member";
import { getMembersPageData } from "@/usecases/readOrbitData";

type MembersPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;

  const filters: MemberFiltersType = {
    groupId: params.groupId,
    status: (params.status as MemberFiltersType["status"]) ?? "active",
    generation: params.generation,
  };

  const { members, groups } = await getMembersPageData(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">メンバー</h1>
        <span className="text-sm text-foreground/50">{members.length}人</span>
      </div>
      <Suspense fallback={<div className="h-10" />}>
        <MemberFilters groups={groups} />
      </Suspense>
      <MemberGrid members={members} />
    </div>
  );
}
