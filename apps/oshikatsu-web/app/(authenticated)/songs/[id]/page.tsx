import { notFound } from "next/navigation";
import { SongDetail } from "@/components/songs/SongDetail";
import { Button } from "@/components/ui/Button";
import { ListBackButton } from "@/components/ui/ListBackButton";
import { PendingLink } from "@/components/ui/PendingLink";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";
import { APP_ROUTES } from "@/lib/routes";
import { getSongDetailPageData } from "@/usecases/readOrbitMusicData";

type SongDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SongDetailPage({ params }: SongDetailPageProps) {
  const { id } = await params;
  const data = await getSongDetailPageData(id);
  const role = await getSessionRole();
  const isAdmin = isAdminRole(role);

  if (!data) {
    notFound();
  }

  const { song, performanceSummary } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ListBackButton
          fallbackHref={APP_ROUTES.songs}
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← 楽曲一覧
        </ListBackButton>
        {isAdmin && (
          <PendingLink href={`/admin/songs/${song.id}/edit`} feedback="global">
            <Button variant="secondary">編集</Button>
          </PendingLink>
        )}
      </div>
      <SongDetail song={song} performanceSummary={performanceSummary} />
    </div>
  );
}
