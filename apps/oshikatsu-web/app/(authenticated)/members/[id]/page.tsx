import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createEventRepository } from "@/repositories/eventRepository";
import { createSongRepository } from "@/repositories/songRepository";
import { getMember } from "@/usecases/getMember";
import { getGroups } from "@/usecases/getGroups";
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
  const memberRepo = createMemberRepository(supabase);
  const groupRepo = createGroupRepository(supabase);
  const eventRepo = createEventRepository(supabase);
  const songRepo = createSongRepository(supabase);
  const [member, groups] = await Promise.all([
    getMember(memberRepo, id),
    getGroups(groupRepo),
  ]);

  if (!member) {
    notFound();
  }
  const [histories, songs] = await Promise.all([
    eventRepo.findHistoryByMemberId(member.id),
    songRepo.findByMemberId(member.id),
  ]);

  const mainGroupId = member.groups[0]?.groupId;
  const mainGroupPenlightColorNames = mainGroupId
    ? (groups.find((group) => group.id === mainGroupId)?.penlightColors ?? []).map(
        (color) => color.name,
      )
    : [];

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
      <MemberProfile
        member={member}
        histories={histories}
        songs={songs}
        mainGroupPenlightColorNames={mainGroupPenlightColorNames}
      />
    </div>
  );
}
