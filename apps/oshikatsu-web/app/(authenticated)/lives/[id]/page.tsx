import { notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { LiveDetail } from "@/components/lives/LiveDetail";
import { getLiveDetailPageData } from "@/usecases/readOrbitData";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getMyAttendancesForLive } from "@/usecases/getMyAttendancesForLive";

type LiveDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LiveDetailPage({ params }: LiveDetailPageProps) {
  const { id } = await params;
  const live = await getLiveDetailPageData(id);

  if (!live) {
    notFound();
  }

  // グローバル部分（公演・セトリ）は従来どおり shared cache 経由の getLiveDetailPageData
  // を使い、ここには手を入れない。参加記録はユーザー別データ（ADR 0009）のため
  // shared cache に載せず、認証付きクライアントで都度取得してページ側で合成する。
  const supabase = await createClient();
  const attendanceRepo = createAttendanceRepository(supabase);
  const myAttendances = await getMyAttendancesForLive(
    attendanceRepo,
    live.performances.map((performance) => performance.id)
  );

  return <LiveDetail live={live} myAttendances={Object.fromEntries(myAttendances)} />;
}
