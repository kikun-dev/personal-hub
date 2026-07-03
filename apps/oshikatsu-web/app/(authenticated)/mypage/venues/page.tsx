import { Suspense } from "react";
import { requireOrbitUser } from "@/lib/requireOrbitUser";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getVenueVisitStats } from "@/usecases/getVenueVisitStats";
import { VenueVisitList } from "@/components/mypage/VenueVisitList";
import { PendingLink } from "@/components/ui/PendingLink";
import { APP_ROUTES } from "@/lib/routes";

export default async function MyPageVenuesPage() {
  // ユーザー別データ（ADR 0009）の入口。admin / viewer 以外は requireOrbitUser 内で
  // リダイレクトされる。以降の read は認証付きクライアント + RLS（本人分のみ）に委ねる。
  const { supabase } = await requireOrbitUser();
  const attendanceRepo = createAttendanceRepository(supabase);
  const entries = await attendanceRepo.findAllForUser();
  const stats = getVenueVisitStats(entries);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PendingLink
          href={APP_ROUTES.mypage}
          feedback="global"
          className="text-sm text-foreground/50 hover:underline"
        >
          ← マイページ
        </PendingLink>
      </div>
      <h1 className="text-xl font-bold text-foreground">参戦した会場</h1>

      {stats.totalVenues === 0 ? (
        // totalVenues は「会場IDがある現地参戦」から作れた会場数。
        // 現地参戦はあるが全件会場未設定のケースがあるため、unknownVenueCount で出し分ける。
        stats.unknownVenueCount > 0 ? (
          <div className="space-y-1">
            <p className="text-sm text-foreground/60">
              会場が設定された現地参戦の記録がありません。
            </p>
            <p className="text-xs text-foreground/40">
              会場未設定の記録{stats.unknownVenueCount}件は集計に含まれていません
            </p>
          </div>
        ) : (
          <p className="text-sm text-foreground/60">
            現地参戦の記録がありません。
            <PendingLink
              href={APP_ROUTES.lives}
              feedback="global"
              className="ml-1 text-blue-500 hover:underline"
            >
              ライブ一覧
            </PendingLink>
            から参戦記録を登録しましょう。
          </p>
        )
      ) : (
        <>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-foreground">
                {stats.totalVenues}会場 {stats.totalVisits}回
              </span>
              <span className="text-xs text-foreground/50">
                現地参戦のみを集計しています
              </span>
            </div>
            {stats.unknownVenueCount > 0 && (
              <p className="text-xs text-foreground/40">
                会場未設定の記録{stats.unknownVenueCount}件は集計に含まれていません
              </p>
            )}
          </div>

          <Suspense fallback={<div className="h-10" />}>
            <VenueVisitList entries={stats.entries} />
          </Suspense>
        </>
      )}
    </div>
  );
}
