import { notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { LiveDetail } from "@/components/lives/LiveDetail";
import { getLiveDetailPageData } from "@/usecases/readOrbitLiveData";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getMyAttendancesForLive } from "@/usecases/getMyAttendancesForLive";
import { parseLiveDateParam } from "@/lib/liveDateContext";

type LiveDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function LiveDetailPage({
  params,
  searchParams,
}: LiveDetailPageProps) {
  const { id } = await params;
  const { date } = await searchParams;
  const live = await getLiveDetailPageData(id);

  if (!live) {
    notFound();
  }

  // 日付 context（#346）: 形式・実在日付を検証し、さらに対象ライブの公演と一致する
  // 場合のみ有効とする。欠落・不正・不一致はすべて直接訪問と同じ fallback（null）。
  const parsedDate = parseLiveDateParam(date);
  const contextDate =
    parsedDate !== null &&
    live.performances.some((p) => p.performanceDate === parsedDate)
      ? parsedDate
      : null;

  // グローバル部分（公演・セトリ）は従来どおり shared cache 経由の getLiveDetailPageData
  // を使い、ここには手を入れない。参戦記録はユーザー別データ（ADR 0009）のため
  // shared cache に載せず、認証付きクライアントで都度取得してページ側で合成する。
  const supabase = await createClient();
  const attendanceRepo = createAttendanceRepository(supabase);
  const myAttendances = await getMyAttendancesForLive(
    attendanceRepo,
    live.performances.map((performance) => performance.id)
  );

  return (
    <LiveDetail
      live={live}
      myAttendances={Object.fromEntries(myAttendances)}
      contextDate={contextDate}
    />
  );
}
