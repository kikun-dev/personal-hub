import { redirect, notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createLiveRepository } from "@/repositories/liveRepository";
import { getLive } from "@/usecases/getLive";
import { getLiveFormMasterData } from "@/usecases/readOrbitAdminData";
import { LiveForm } from "@/components/admin/LiveForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { updateLiveAction, deleteLiveAction } from "./actions";
import type { CreateLiveInput, UpdateLiveInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";

type EditLivePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditLivePage({ params }: EditLivePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const live = await getLive(createLiveRepository(supabase), id);

  if (!live) {
    notFound();
  }

  const { groups, members, venues, songOptions } = await getLiveFormMasterData();

  const initialValues: CreateLiveInput = {
    name: live.name,
    liveType: live.liveType,
    description: live.description ?? "",
    performerGroupIds: live.performerGroups.map((group) => group.groupId),
    performerMemberIds: live.performerMembers.map((member) => member.memberId),
    performances: live.performances.map((performance) => ({
      venueId: performance.venueId ?? "",
      performanceDate: performance.performanceDate ?? "",
      doorsOpenAt: performance.doorsOpenAt ?? "",
      startsAt: performance.startsAt ?? "",
      sessionLabel: performance.sessionLabel ?? "",
      hasStreaming: performance.hasStreaming,
      hasLiveViewing: performance.hasLiveViewing,
      ticketInfo: performance.ticketInfo ?? "",
      seatInfo: performance.seatInfo ?? "",
      absences: performance.absences.map((absence) => ({
        memberId: absence.memberId,
        note: absence.note ?? "",
      })),
      setlistItems: performance.setlistItems.map((item) => ({
        itemType: item.itemType,
        trackId: item.trackId ?? "",
        songTitle: item.songTitle ?? "",
        note: item.note ?? "",
      })),
    })),
  };

  async function handleSubmit(
    values: UpdateLiveInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await updateLiveAction(id, values);
    if (!result.errors) {
      redirect("/admin/lives");
    }
    return result;
  }

  async function handleDelete(): Promise<{ error?: string }> {
    "use server";
    const result = await deleteLiveAction(id);
    if (!result.error) {
      redirect("/admin/lives");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">ライブを編集</h1>
        <DeleteButton
          confirmMessage={`${live.name} を削除しますか？`}
          onDelete={handleDelete}
        />
      </div>
      <LiveForm
        mode="edit"
        groups={groups}
        members={members}
        venues={venues}
        tracks={songOptions}
        initialValues={initialValues}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
