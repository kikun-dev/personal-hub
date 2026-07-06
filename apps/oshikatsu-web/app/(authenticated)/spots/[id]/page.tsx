import { notFound } from "next/navigation";
import { SpotDetail } from "@/components/spots/SpotDetail";
import { Button } from "@/components/ui/Button";
import { ListBackButton } from "@/components/ui/ListBackButton";
import { PendingLink } from "@/components/ui/PendingLink";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";
import { APP_ROUTES } from "@/lib/routes";
import { getSpotDetailPageData } from "@/usecases/readOrbitData";

type SpotDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SpotDetailPage({ params }: SpotDetailPageProps) {
  const { id } = await params;
  const spot = await getSpotDetailPageData(id);
  const role = await getSessionRole();
  const isAdmin = isAdminRole(role);

  if (!spot) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ListBackButton
          fallbackHref={APP_ROUTES.spots}
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← 聖地マップ一覧
        </ListBackButton>
        {isAdmin && (
          <PendingLink href={`/spots/${spot.id}/edit`} feedback="global">
            <Button variant="secondary">編集</Button>
          </PendingLink>
        )}
      </div>
      <SpotDetail spot={spot} />
    </div>
  );
}
