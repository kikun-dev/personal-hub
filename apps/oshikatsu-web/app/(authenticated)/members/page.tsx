import { Suspense } from "react";
import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { listMembers } from "@/usecases/listMembers";
import { getGroups } from "@/usecases/getGroups";
import { MemberGrid } from "@/components/members/MemberGrid";
import { MemberFilters } from "@/components/members/MemberFilters";
import type { MemberFilters as MemberFiltersType } from "@/types/member";

type MembersPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const memberRepo = createMemberRepository(supabase);
  const groupRepo = createGroupRepository(supabase);

  const filters: MemberFiltersType = {
    groupId: params.groupId,
    status: (params.status as MemberFiltersType["status"]) ?? "all",
    generation: params.generation,
  };

  const [members, groups] = await Promise.all([
    listMembers(memberRepo, filters),
    getGroups(groupRepo),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">メンバー</h1>
        <span className="text-sm text-foreground/50">{members.length}人</span>
      </div>
      <Suspense>
        <MemberFilters groups={groups} />
      </Suspense>
      <MemberGrid members={members} />
    </div>
  );
}
