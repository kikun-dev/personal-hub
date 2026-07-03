import { notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { SongDetail } from "@/components/songs/SongDetail";
import { Button } from "@/components/ui/Button";
import { ListBackButton } from "@/components/ui/ListBackButton";
import { PendingLink } from "@/components/ui/PendingLink";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";
import { APP_ROUTES } from "@/lib/routes";
import { getSongDetailPageData } from "@/usecases/readOrbitData";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getSongEncounterSummary } from "@/usecases/getSongEncounterSummary";

type SongDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SongDetailPage({ params }: SongDetailPageProps) {
  const { id } = await params;
  const song = await getSongDetailPageData(id);
  const role = await getSessionRole();
  const isAdmin = isAdminRole(role);

  if (!song) {
    notFound();
  }

  // グローバル部分（楽曲情報）は shared cache 経由の getSongDetailPageData のまま。
  // 遭遇記録はユーザー別データ（ADR 0009）のため shared cache に載せず、
  // 認証付きクライアントで都度取得してページ側で合成する
  // （lives/[id]/page.tsx の参戦記録合成と同じパターン）。未認証の場合は
  // RLS により空配列が返るため、ページ自体はログイン不要のまま扱える。
  const supabase = await createClient();
  const attendanceRepo = createAttendanceRepository(supabase);
  const encounters = await attendanceRepo.findSongEncounters();
  const encounterSummary = getSongEncounterSummary(encounters, song.id);

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
      <SongDetail song={song} encounterSummary={encounterSummary} />
    </div>
  );
}
