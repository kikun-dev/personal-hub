import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/requireAdmin";
import { getSpotFormMasterData } from "@/usecases/readOrbitAdminData";
import { SpotForm } from "@/components/admin/SpotForm";
import { createSpotAction } from "./actions";
import type { CreateSpotInput } from "@/types/spot";
import type { ValidationError } from "@/types/errors";

export default async function NewSpotPage() {
  await requireAdmin();
  const masters = await getSpotFormMasterData();

  async function handleSubmit(
    values: CreateSpotInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createSpotAction(values);
    if (!result.errors) {
      redirect("/spots");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">スポットを追加</h1>
      <SpotForm mode="create" masters={masters} onSubmit={handleSubmit} />
    </div>
  );
}
