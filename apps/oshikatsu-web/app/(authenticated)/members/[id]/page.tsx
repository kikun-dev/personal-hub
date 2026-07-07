import { notFound } from "next/navigation";
import { MemberProfile } from "@/components/members/MemberProfile";
import { Button } from "@/components/ui/Button";
import { ListBackButton } from "@/components/ui/ListBackButton";
import { PendingLink } from "@/components/ui/PendingLink";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";
import { APP_ROUTES } from "@/lib/routes";
import { getMemberDetailPageData } from "@/usecases/readOrbitMusicData";

type MemberDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MemberDetailPage({
  params,
}: MemberDetailPageProps) {
  const { id } = await params;
  const data = await getMemberDetailPageData(id);
  const role = await getSessionRole();
  const isAdmin = isAdminRole(role);

  if (!data) {
    notFound();
  }
  const {
    histories,
    mainGroupPenlightColorNames,
    member,
    songs,
    centerTrackIds,
    selectionPositions,
  } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ListBackButton
          fallbackHref={APP_ROUTES.members}
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← メンバー一覧
        </ListBackButton>
        {isAdmin && (
          <PendingLink
            href={`/admin/members/${member.id}/edit`}
            feedback="global"
          >
            <Button variant="secondary">編集</Button>
          </PendingLink>
        )}
      </div>
      <MemberProfile
        member={member}
        histories={histories}
        songs={songs}
        centerTrackIds={centerTrackIds}
        selectionPositions={selectionPositions}
        mainGroupPenlightColorNames={mainGroupPenlightColorNames}
      />
    </div>
  );
}
