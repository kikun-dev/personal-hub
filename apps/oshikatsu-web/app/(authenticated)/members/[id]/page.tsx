import { notFound } from "next/navigation";
import { MemberProfile } from "@/components/members/MemberProfile";
import { Button } from "@/components/ui/Button";
import { ListBackButton } from "@/components/ui/ListBackButton";
import { PendingLink } from "@/components/ui/PendingLink";
import { getMemberDetailPageData } from "@/usecases/readOrbitData";

type MemberDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberDetailPage({
  params,
}: MemberDetailPageProps) {
  const { id } = await params;
  const data = await getMemberDetailPageData(id);

  if (!data) {
    notFound();
  }
  const { histories, mainGroupPenlightColorNames, member, songs } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ListBackButton
          fallbackHref="/members"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← メンバー一覧
        </ListBackButton>
        <PendingLink
          href={`/admin/members/${member.id}/edit`}
          feedback="global"
        >
          <Button variant="secondary">編集</Button>
        </PendingLink>
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
