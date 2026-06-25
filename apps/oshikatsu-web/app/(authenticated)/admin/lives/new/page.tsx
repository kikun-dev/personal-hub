import { redirect } from "next/navigation";
import { LiveForm } from "@/components/admin/LiveForm";
import { getLiveFormMasterData } from "@/usecases/readOrbitAdminData";
import { createLiveAction } from "./actions";
import type { CreateLiveInput } from "@/types/live";
import type { ValidationError } from "@/types/errors";

export default async function NewLivePage() {
  const { groups, members, venues, songOptions } = await getLiveFormMasterData();

  async function handleSubmit(
    values: CreateLiveInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createLiveAction(values);
    if (!result.errors) {
      redirect("/admin/lives");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">ライブを追加</h1>
      <LiveForm
        mode="create"
        groups={groups}
        members={members}
        venues={venues}
        tracks={songOptions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
