import { notFound } from "next/navigation";
import { ReleaseDetail } from "@/components/releases/ReleaseDetail";
import { Button } from "@/components/ui/Button";
import { ListBackButton } from "@/components/ui/ListBackButton";
import { PendingLink } from "@/components/ui/PendingLink";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";
import { APP_ROUTES } from "@/lib/routes";
import { getReleaseDetailPageData } from "@/usecases/readOrbitMusicData";

type ReleaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReleaseDetailPage({ params }: ReleaseDetailPageProps) {
  const { id } = await params;
  const release = await getReleaseDetailPageData(id);
  const role = await getSessionRole();
  const isAdmin = isAdminRole(role);

  if (!release) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ListBackButton
          fallbackHref={APP_ROUTES.releases}
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← リリース一覧
        </ListBackButton>
        {isAdmin && (
          <PendingLink
            href={`/admin/releases/${release.id}/edit`}
            feedback="global"
          >
            <Button variant="secondary">編集</Button>
          </PendingLink>
        )}
      </div>
      <ReleaseDetail release={release} />
    </div>
  );
}
