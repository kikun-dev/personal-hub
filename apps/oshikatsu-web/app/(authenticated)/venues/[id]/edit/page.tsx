import { redirect, notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createVenueRepository } from "@/repositories/venueRepository";
import { getVenue } from "@/usecases/getVenue";
import { VenueForm } from "@/components/admin/VenueForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { updateVenueAction, deleteVenueAction } from "./actions";
import type { UpdateVenueInput } from "@/types/venue";
import type { ValidationError } from "@/types/errors";

type EditVenuePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditVenuePage({ params }: EditVenuePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const venue = await getVenue(createVenueRepository(supabase), id);

  if (!venue) {
    notFound();
  }

  const initialValues: UpdateVenueInput = {
    name: venue.name,
    prefecture: venue.prefecture ?? "",
    capacity: venue.capacity != null ? String(venue.capacity) : "",
    mapUrl: venue.mapUrl ?? "",
    officialUrl: venue.officialUrl ?? "",
    access: venue.access ?? "",
    notes: venue.notes ?? "",
  };

  async function handleSubmit(
    values: UpdateVenueInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await updateVenueAction(id, values);
    if (!result.errors) {
      redirect("/venues");
    }
    return result;
  }

  async function handleDelete(): Promise<{ error?: string }> {
    "use server";
    const result = await deleteVenueAction(id);
    if (!result.error) {
      redirect("/venues");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">会場を編集</h1>
        <DeleteButton
          confirmMessage={`${venue.name} を削除しますか？`}
          onDelete={handleDelete}
        />
      </div>
      <VenueForm mode="edit" initialValues={initialValues} onSubmit={handleSubmit} />
    </div>
  );
}
