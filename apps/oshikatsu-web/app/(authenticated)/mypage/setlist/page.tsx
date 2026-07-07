import { Suspense } from "react";
import { requireOrbitUser } from "@/lib/requireOrbitUser";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getSongsPageData } from "@/usecases/readOrbitMusicData";
import { SetlistCountBrowser } from "@/components/mypage/SetlistCountBrowser";
import { PendingLink } from "@/components/ui/PendingLink";
import { APP_ROUTES } from "@/lib/routes";

export default async function SetlistCountPage() {
  // ユーザー別データ（ADR 0009）の入口。admin / viewer 以外は requireOrbitUser 内で
  // リダイレクトされる。以降の read は認証付きクライアント + RLS（本人分のみ）に委ねる。
  const { supabase } = await requireOrbitUser();
  const attendanceRepo = createAttendanceRepository(supabase);

  // 遭遇データ（ユーザー別、認証付きクライアント）と楽曲母集合（グローバルデータ、
  // 楽曲一覧ページ（/songs）と同じ shared cache 経由の loader）を並行取得する。
  // 絞り込みは /songs 同様クライアント側で行うため、母集合は常に全件取得する。
  const [encounters, { songs, groups }] = await Promise.all([
    attendanceRepo.findSongEncounters(),
    getSongsPageData({}),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PendingLink
          href={APP_ROUTES.mypage}
          feedback="global"
          className="text-sm text-foreground/50 hover:underline"
        >
          ← マイページ
        </PendingLink>
      </div>
      <h1 className="text-xl font-bold text-foreground">セトリログ</h1>
      <Suspense fallback={<div className="h-10" />}>
        <SetlistCountBrowser groups={groups} songs={songs} encounters={encounters} />
      </Suspense>
    </div>
  );
}
