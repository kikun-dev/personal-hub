import { notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { LiveDetail } from "@/components/lives/LiveDetail";
import { getLiveDetailPageData } from "@/usecases/readOrbitLiveData";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getMyAttendancesForLive } from "@/usecases/getMyAttendancesForLive";
import {
  parseLiveDateParam,
  parseLivePerformanceParam,
  type LiveDateContext,
} from "@/lib/liveDateContext";

type LiveDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; performance?: string }>;
};

export default async function LiveDetailPage({
  params,
  searchParams,
}: LiveDetailPageProps) {
  const { id } = await params;
  const { date, performance } = await searchParams;
  const live = await getLiveDetailPageData(id);

  if (!live) {
    notFound();
  }

  // 日付 context（#346）: date（戻り先の日次文脈）と performance（この公演）の両方を
  // 境界で検証し、さらに「対象ライブの公演に存在」かつ「その公演の performanceDate === date」
  // の場合のみ有効とする。欠落・不正・不一致はすべて直接訪問と同じ fallback（null）。
  const parsedDate = parseLiveDateParam(date);
  const parsedPerformanceId = parseLivePerformanceParam(performance);
  const isValidContext =
    parsedDate !== null &&
    parsedPerformanceId !== null &&
    live.performances.some(
      (p) => p.id === parsedPerformanceId && p.performanceDate === parsedDate
    );
  const context: LiveDateContext | null = isValidContext
    ? { date: parsedDate, performanceId: parsedPerformanceId }
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
      context={context}
    />
  );
}
