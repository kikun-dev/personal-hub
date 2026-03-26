import { notFound } from "next/navigation";
import Link from "next/link";
import { MemberProfile } from "@/components/members/MemberProfile";
import { Button } from "@/components/ui/Button";
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
