import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { listMembers } from "@/usecases/listMembers";
import { Button } from "@/components/ui/Button";
import { GroupBadge } from "@/components/ui/GroupBadge";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const repo = createMemberRepository(supabase);
  const members = await listMembers(repo);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">メンバー管理</h1>
        <Link href="/admin/members/new">
          <Button>新規追加</Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 text-left">
              <th className="pb-2 pr-4 font-medium text-foreground/70">名前</th>
              <th className="pb-2 pr-4 font-medium text-foreground/70">グループ</th>
              <th className="pb-2 font-medium text-foreground/70">操作</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-foreground/5"
              >
                <td className="py-2 pr-4">
                  <div>
                    <span className="text-foreground">{member.nameJa}</span>
                    <span className="ml-2 text-xs text-foreground/40">
                      {member.nameKana}
                    </span>
                  </div>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {member.groups.map((g) => (
                      <GroupBadge
                        key={g.id}
                        groupName={g.groupNameJa}
                        groupColor={g.groupColor}
                        generation={g.generation}
                      />
                    ))}
                  </div>
                </td>
                <td className="py-2">
                  <Link
                    href={`/admin/members/${member.id}/edit`}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {members.length === 0 && (
        <p className="py-12 text-center text-sm text-foreground/50">
          メンバーが登録されていません
        </p>
      )}
    </div>
  );
}
