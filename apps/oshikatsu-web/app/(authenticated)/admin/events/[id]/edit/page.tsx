import { redirect, notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createEventRepository } from "@/repositories/eventRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createEventTypeRepository } from "@/repositories/eventTypeRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { getGroups } from "@/usecases/getGroups";
import { getEventTypes } from "@/usecases/getEventTypes";
import { listMembers } from "@/usecases/listMembers";
import { EventForm } from "@/components/admin/EventForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { updateEventAction, deleteEventAction } from "./actions";
import type { UpdateEventInput } from "@/types/event";
import type { ValidationError } from "@/types/errors";

type EditEventPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({
  params,
}: EditEventPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [event, eventTypes, groups, members] = await Promise.all([
    createEventRepository(supabase).findById(id),
    getEventTypes(createEventTypeRepository(supabase)),
    getGroups(createGroupRepository(supabase)),
    listMembers(createMemberRepository(supabase)),
  ]);

  if (!event) {
    notFound();
  }

  const initialValues: UpdateEventInput = {
    eventTypeId: event.eventTypeId,
    title: event.title,
    description: event.description,
    date: event.date,
    endDate: event.endDate ?? "",
    startTime: event.startTime ?? "",
    venue: event.venue ?? "",
    url: event.url ?? "",
    isMemberHistory: event.isMemberHistory,
    groupIds: event.groupIds,
    memberIds: event.memberIds,
  };

  async function handleSubmit(
    values: UpdateEventInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await updateEventAction(id, values);
    if (!result.errors) {
      redirect("/admin/events");
    }
    return result;
  }

  async function handleDelete(): Promise<{ error?: string }> {
    "use server";
    const result = await deleteEventAction(id);
    if (!result.error) {
      redirect("/admin/events");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">イベントを編集</h1>
        <DeleteButton
          confirmMessage={`「${event.title}」を削除しますか？`}
          onDelete={handleDelete}
        />
      </div>
      <EventForm
        mode="edit"
        initialValues={initialValues}
        eventTypes={eventTypes}
        groups={groups}
        members={members}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
