import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { getMember } from "@/usecases/getMember";
import { MemberProfile } from "@/components/members/MemberProfile";
import { Button } from "@/components/ui/Button";

type MemberDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberDetailPage({
  params,
}: MemberDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const repo = createMemberRepository(supabase);
  const member = await getMember(repo, id);

  if (!member) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/members"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← メンバー一覧
        </Link>
        <Link href={`/admin/members/${member.id}/edit`}>
          <Button variant="secondary">編集</Button>
        </Link>
      </div>
      <MemberProfile member={member} />
    </div>
  );
}
