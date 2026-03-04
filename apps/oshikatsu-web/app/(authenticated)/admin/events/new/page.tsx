import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createEventTypeRepository } from "@/repositories/eventTypeRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { getGroups } from "@/usecases/getGroups";
import { getEventTypes } from "@/usecases/getEventTypes";
import { listMembers } from "@/usecases/listMembers";
import { EventForm } from "@/components/admin/EventForm";
import { createEventAction } from "./actions";
import type { CreateEventInput } from "@/types/event";
import type { ValidationError } from "@/types/errors";

export default async function NewEventPage() {
  const supabase = await createClient();

  const [eventTypes, groups, members] = await Promise.all([
    getEventTypes(createEventTypeRepository(supabase)),
    getGroups(createGroupRepository(supabase)),
    listMembers(createMemberRepository(supabase)),
  ]);

  async function handleSubmit(
    values: CreateEventInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createEventAction(values);
    if (!result.errors) {
      redirect("/admin/events");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">イベントを追加</h1>
      <EventForm
        mode="create"
        eventTypes={eventTypes}
        groups={groups}
        members={members}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
