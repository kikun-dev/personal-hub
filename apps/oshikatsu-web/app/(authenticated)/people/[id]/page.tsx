import { notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createPersonRepository } from "@/repositories/personRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { getPersonDetail } from "@/usecases/getPersonDetail";
import { createPersonCreditedSongSections } from "@/usecases/groupListSections";
import { PersonDetail } from "@/components/people/PersonDetail";
import { Button } from "@/components/ui/Button";
import { ListBackButton } from "@/components/ui/ListBackButton";
import { PendingLink } from "@/components/ui/PendingLink";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";
import { APP_ROUTES } from "@/lib/routes";

type PersonDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PersonDetailPage({
  params,
}: PersonDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const repo = createPersonRepository(supabase);
  const [detail, groups] = await Promise.all([
    getPersonDetail(repo, id),
    createGroupRepository(supabase).findAll(),
  ]);
  const role = await getSessionRole();
  const isAdmin = isAdminRole(role);

  if (!detail) {
    notFound();
  }

  const sections = createPersonCreditedSongSections(
    detail.creditedSongs,
    groups
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ListBackButton
          fallbackHref={APP_ROUTES.people}
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← 制作陣一覧
        </ListBackButton>
        {isAdmin && (
          <PendingLink href={`/people/${id}/edit`} feedback="global">
            <Button variant="secondary">編集</Button>
          </PendingLink>
        )}
      </div>
      <PersonDetail person={detail.person} sections={sections} />
    </div>
  );
}
