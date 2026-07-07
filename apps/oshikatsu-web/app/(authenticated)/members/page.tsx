import { Suspense } from "react";
import { MemberBrowser } from "@/components/members/MemberBrowser";
import { getMembersPageData } from "@/usecases/readOrbitMusicData";

export default async function MembersPage() {
  // 絞り込みはクライアント側で行うため、卒業含む全件を取得する
  const { members, groups } = await getMembersPageData({ status: "all" });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">メンバー</h1>
      <Suspense fallback={<div className="h-10" />}>
        <MemberBrowser groups={groups} members={members} />
      </Suspense>
    </div>
  );
}
