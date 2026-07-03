import { Suspense } from "react";
import { requireOrbitUser } from "@/lib/requireOrbitUser";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getAttendanceStats } from "@/usecases/getAttendanceStats";
import { AttendanceStats } from "@/components/mypage/AttendanceStats";
import { PendingLink } from "@/components/ui/PendingLink";
import { APP_ROUTES } from "@/lib/routes";

type MyPageStatsProps = {
  searchParams: Promise<{ year?: string; group?: string }>;
};

// "?year=" を年（整数）としてパースする。未指定・不正値はフィルタなし（undefined）扱い。
function parseYearParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const year = Number(value);
  return Number.isInteger(year) ? year : undefined;
}

export default async function MyPageStatsPage({ searchParams }: MyPageStatsProps) {
  // ユーザー別データ（ADR 0009）の入口。admin / viewer 以外は requireOrbitUser 内で
  // リダイレクトされる。以降の read は認証付きクライアント + RLS（本人分のみ）に委ねる。
  const { supabase } = await requireOrbitUser();
  const attendanceRepo = createAttendanceRepository(supabase);
  const entries = await attendanceRepo.findAllForUser();

  const params = await searchParams;
  const year = parseYearParam(params.year);
  const groupId = params.group || undefined;

  const stats = getAttendanceStats(entries, { year, groupId });

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">参加記録</h1>
        <PendingLink
          href={APP_ROUTES.mypageSetlist}
          feedback="global"
          className="text-xs text-blue-500 hover:underline"
        >
          セットリストを見る
        </PendingLink>
      </div>

      <Suspense fallback={<div className="h-10" />}>
        <AttendanceStats stats={stats} year={year} groupId={groupId} />
      </Suspense>
    </div>
  );
}
