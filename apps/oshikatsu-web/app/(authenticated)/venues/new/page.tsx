import { redirect } from "next/navigation";
import { VenueForm } from "@/components/admin/VenueForm";
import { createVenueAction } from "./actions";
import type { CreateVenueInput } from "@/types/venue";
import type { ValidationError } from "@/types/errors";

export default async function NewVenuePage() {
  async function handleSubmit(
    values: CreateVenueInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createVenueAction(values);
    if (!result.errors) {
      redirect("/venues");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">会場を追加</h1>
      <VenueForm mode="create" onSubmit={handleSubmit} />
    </div>
  );
}
