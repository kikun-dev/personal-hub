import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/requireAdmin";
import { getLiveDetailPageData } from "@/usecases/readOrbitData";
import { getLiveFormMasterData } from "@/usecases/readOrbitAdminData";
import { SetlistEditor } from "@/components/lives/SetlistEditor";
import {
  replacePerformanceSetlistAction,
  getTrackSetlistFormationAction,
} from "./actions";
import type { LivePerformance, SetlistItem, SetlistEditorItemInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";
import { formatMonthDayWithWeekday } from "@/lib/formatters";

type SetlistEditPageProps = {
  params: Promise<{ id: string; performanceId: string }>;
};

// #261: セットリスト編集ビュー。参照ビュー（setlist/page.tsx）と同じデータソース
// （getLiveDetailPageData）から該当公演を取り出し、SetlistEditorItemInput へ変換して渡す。
function toSetlistEditorItem(item: SetlistItem): SetlistEditorItemInput {
  return {
    itemType: item.itemType,
    trackId: item.trackId ?? "",
    songTitle: item.songTitle ?? "",
    note: item.note ?? "",
    section: item.section,
    performanceStyles: item.performanceStyles,
    costumeNote: item.costumeNote ?? "",
    members: item.members.map((member) => ({
      memberId: member.memberId,
      isCenter: member.isCenter,
    })),
    formationRows: item.formationRows.map((row) => ({
      memberIds: row.members.map((member) => member.memberId),
    })),
  };
}

export default async function SetlistEditPage({ params }: SetlistEditPageProps) {
  // 非adminはリダイレクト（多層防御。実データ操作は Server Action 側でも requireAdmin する）
  await requireAdmin();

  const { id, performanceId } = await params;
  const live = await getLiveDetailPageData(id);
  if (!live) {
    notFound();
  }

  const performance = live.performances.find((p) => p.id === performanceId);
  if (!performance) {
    notFound();
  }

  const { songOptions } = await getLiveFormMasterData();

  const roster = live.performerMembers.map((member) => ({
    memberId: member.memberId,
    memberNameJa: member.memberNameJa,
  }));
  const rosterMemberIds = roster.map((member) => member.memberId);

  const initialItems = performance.setlistItems.map(toSetlistEditorItem);

  function formatPerformanceLabel(p: LivePerformance, fallbackIndex: number): string {
    if (!p.performanceDate && !p.venueName) {
      return `公演${fallbackIndex + 1}`;
    }
    const date = p.performanceDate ? formatMonthDayWithWeekday(p.performanceDate) : "";
    const venue = p.venueName ?? "";
    return [date, venue].filter(Boolean).join(" ");
  }

  const copySources = live.performances
    .filter((p) => p.id !== performanceId && p.setlistItems.length > 0)
    .map((p, index) => ({
      id: p.id,
      label: formatPerformanceLabel(p, index),
      items: p.setlistItems.map(toSetlistEditorItem),
    }));

  const performanceIndex = live.performances.findIndex((p) => p.id === performanceId);
  const performanceLabel = formatPerformanceLabel(performance, performanceIndex);

  async function handleSubmit(
    items: SetlistEditorItemInput[]
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await replacePerformanceSetlistAction(
      performanceId,
      { items },
      rosterMemberIds
    );
    if (!result.errors) {
      redirect(`/lives/${id}/performances/${performanceId}/setlist`);
    }
    return result;
  }

  return (
    <SetlistEditor
      live={{ id: live.id, name: live.name }}
      performanceId={performanceId}
      performanceLabel={performanceLabel}
      initialItems={initialItems}
      roster={roster}
      trackOptions={songOptions}
      copySources={copySources}
      onSubmit={handleSubmit}
      getTrackFormation={getTrackSetlistFormationAction}
    />
  );
}
