import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@personal-hub/supabase/server";
import { createSongRepository } from "@/repositories/songRepository";
import { getSong } from "@/usecases/getSong";
import { SongDetail } from "@/components/songs/SongDetail";
import { Button } from "@/components/ui/Button";

type SongDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SongDetailPage({ params }: SongDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const repo = createSongRepository(supabase);
  const song = await getSong(repo, id);

  if (!song) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/songs"
          className="text-sm text-foreground/60 hover:text-foreground"
        >
          ← 楽曲一覧
        </Link>
        <Link href={`/admin/songs/${song.id}/edit`}>
          <Button variant="secondary">編集</Button>
        </Link>
      </div>
      <SongDetail song={song} />
    </div>
  );
}
