import { redirect } from "next/navigation";
import { EventForm } from "@/components/admin/EventForm";
import { getEventFormMasterData } from "@/usecases/readOrbitAdminData";
import { createEventAction } from "./actions";
import type { CreateEventInput } from "@/types/event";
import type { ValidationError } from "@/types/errors";

export default async function NewEventPage() {
  const { eventTypes, groups, members } = await getEventFormMasterData();

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
