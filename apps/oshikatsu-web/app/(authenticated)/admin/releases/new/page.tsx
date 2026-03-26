import { redirect } from "next/navigation";
import { ReleaseForm } from "@/components/admin/ReleaseForm";
import { getReleaseFormMasterData } from "@/usecases/readOrbitAdminData";
import { createReleaseAction } from "./actions";
import type { CreateReleaseInput, ReleaseImageUploadInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";

export default async function NewReleasePage() {
  const { groups, members, songOptions, people } = await getReleaseFormMasterData();

  async function handleSubmit(
    values: CreateReleaseInput,
    imageFile?: ReleaseImageUploadInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createReleaseAction(values, imageFile);
    if (!result.errors) {
      redirect("/admin/releases");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">リリースを追加</h1>
      <ReleaseForm
        mode="create"
        groups={groups}
        members={members}
        tracks={songOptions}
        people={people.map((person) => person.displayName)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
