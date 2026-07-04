import { notFound } from "next/navigation";
import { SetlistDetail } from "@/components/lives/SetlistDetail";
import { getSessionRole, isAdminRole } from "@/lib/getSessionRole";
import { getLiveDetailPageData } from "@/usecases/readOrbitData";

type SetlistDetailPageProps = {
  params: Promise<{ id: string; performanceId: string }>;
};

// #261: セトリ詳細の参照ビュー。公演ごとURL（Issue Decision）。
// データはライブ詳細と同じ shared cache（getLiveDetailPageData）から該当公演を
// 取り出す。ライブが無い・公演が一致しない場合は notFound（キャッシュのタグ・キーは
// 変更しない）
export default async function SetlistDetailPage({
  params,
}: SetlistDetailPageProps) {
  const { id, performanceId } = await params;
  const live = await getLiveDetailPageData(id);

  if (!live) {
    notFound();
  }

  const performance = live.performances.find((p) => p.id === performanceId);
  if (!performance) {
    notFound();
  }

  // 参照ビュー自体は admin / viewer 共通。ロールは空状態の予告テキスト表示のみに使う
  // （UI出し分け専用ヘルパー。認可判定には使わない。lib/getSessionRole.ts 参照）
  const role = await getSessionRole();
  const isAdmin = isAdminRole(role);

  return (
    <SetlistDetail
      live={{ id: live.id, name: live.name, liveType: live.liveType }}
      performance={performance}
      isAdmin={isAdmin}
    />
  );
}
