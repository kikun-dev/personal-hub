import { notFound } from "next/navigation";
import { SongDetail } from "@/components/songs/SongDetail";
import { Button } from "@/components/ui/Button";
import { ListBackButton } from "@/components/ui/ListBackButton";
import { PendingLink } from "@/components/ui/PendingLink";
import { getSongDetailPageData } from "@/usecases/readOrbitData";

type SongDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SongDetailPage({ params }: SongDetailPageProps) {
  const { id } = await params;
  const song = await getSongDetailPageData(id);

  if (!song) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ListBackButton
          fallbackHref="/songs"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← 楽曲一覧
        </ListBackButton>
        <PendingLink href={`/admin/songs/${song.id}/edit`} feedback="global">
          <Button variant="secondary">編集</Button>
        </PendingLink>
      </div>
      <SongDetail song={song} />
    </div>
  );
}
