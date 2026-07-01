import { notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createPersonRepository } from "@/repositories/personRepository";
import { getPersonDetail } from "@/usecases/getPersonDetail";
import { PersonDetail } from "@/components/people/PersonDetail";
import { Button } from "@/components/ui/Button";
import { ListBackButton } from "@/components/ui/ListBackButton";
import { PendingLink } from "@/components/ui/PendingLink";
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
  const detail = await getPersonDetail(repo, id);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ListBackButton
          fallbackHref={APP_ROUTES.people}
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← 制作陣一覧
        </ListBackButton>
        <PendingLink href={`/people/${id}/edit`} feedback="global">
          <Button variant="secondary">編集</Button>
        </PendingLink>
      </div>
      <PersonDetail detail={detail} />
    </div>
  );
}
