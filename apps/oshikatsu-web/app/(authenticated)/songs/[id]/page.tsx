import { notFound } from "next/navigation";
import { SongDetail } from "@/components/songs/SongDetail";
import { Button } from "@/components/ui/Button";
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
        <PendingLink
          href="/songs"
          feedback="global"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← 楽曲一覧
        </PendingLink>
        <PendingLink href={`/admin/songs/${song.id}/edit`} feedback="global">
          <Button variant="secondary">編集</Button>
        </PendingLink>
      </div>
      <SongDetail song={song} />
    </div>
  );
}
