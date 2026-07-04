import { createClient } from "@personal-hub/supabase/server";
import { createSongRepository } from "@/repositories/songRepository";
import { listSongs } from "@/usecases/listSongs";
import { Button } from "@/components/ui/Button";
import { PendingLink } from "@/components/ui/PendingLink";
import { AdminSongsTable } from "@/components/admin/AdminSongsTable";

export default async function AdminSongsPage() {
  const supabase = await createClient();

  const songs = await listSongs(createSongRepository(supabase));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">楽曲管理</h1>
        <PendingLink href="/admin/songs/new" feedback="global">
          <Button>新規追加</Button>
        </PendingLink>
      </div>

      <AdminSongsTable songs={songs} />
    </div>
  );
}
