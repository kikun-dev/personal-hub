import { redirect, notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createSpotRepository } from "@/repositories/spotRepository";
import { getSpot } from "@/usecases/getSpot";
import { getSpotFormMasterData } from "@/usecases/readOrbitAdminData";
import { SpotForm } from "@/components/admin/SpotForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { updateSpotAction, deleteSpotAction } from "./actions";
import type { Spot, UpdateSpotInput } from "@/types/spot";
import type { ValidationError } from "@/types/errors";

type EditSpotPageProps = {
  params: Promise<{ id: string }>;
};

// Spot（ドメイン型。number/null）→ UpdateSpotInput（フォーム型。全フィールド文字列）への変換。
// number→string、null→""、appearances→出典FKやメンバーIDを文字列/配列の入力型へ整形する。
function toInitialValues(spot: Spot): UpdateSpotInput {
  return {
    name: spot.name,
    category: spot.category,
    description: spot.description ?? "",
    latitude: String(spot.latitude),
    longitude: String(spot.longitude),
    address: spot.address ?? "",
    prefecture: spot.prefecture ?? "",
    googlePlaceId: spot.googlePlaceId ?? "",
    googleMapsUrl: spot.googleMapsUrl ?? "",
    appearances: spot.appearances.map((appearance) => ({
      sourceType: appearance.sourceType,
      trackId: appearance.trackId ?? "",
      videoId: appearance.videoId ?? "",
      eventId: appearance.eventId ?? "",
      liveId: appearance.liveId ?? "",
      seriesName: appearance.seriesName ?? "",
      appearedOn: appearance.appearedOn ?? "",
      note: appearance.note ?? "",
      linkUrl: appearance.linkUrl ?? "",
      memberIds: appearance.members.map((member) => member.id),
    })),
  };
}

export default async function EditSpotPage({ params }: EditSpotPageProps) {
  const { id } = await params;
  await requireAdmin();

  const supabase = await createClient();
  const spot = await getSpot(createSpotRepository(supabase), id);

  if (!spot) {
    notFound();
  }

  const masters = await getSpotFormMasterData();
  const initialValues = toInitialValues(spot);

  async function handleSubmit(
    values: UpdateSpotInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await updateSpotAction(id, values);
    if (!result.errors) {
      redirect("/spots");
    }
    return result;
  }

  async function handleDelete(): Promise<{ error?: string }> {
    "use server";
    const result = await deleteSpotAction(id);
    if (!result.error) {
      redirect("/spots");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">スポットを編集</h1>
        <DeleteButton
          confirmMessage={`${spot.name} を削除しますか？`}
          onDelete={handleDelete}
        />
      </div>
      <SpotForm
        mode="edit"
        initialValues={initialValues}
        masters={masters}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
