import { redirect } from "next/navigation";
import { SongForm } from "@/components/admin/SongForm";
import { getSongFormMasterData } from "@/usecases/readOrbitAdminData";
import { createSongAction } from "./actions";
import type { CreateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";

export default async function NewSongPage() {
  const { releases, members, people, groups } = await getSongFormMasterData();

  async function handleSubmit(
    values: CreateSongInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createSongAction(values);
    if (!result.errors) {
      redirect("/admin/songs");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">楽曲を追加</h1>
      <SongForm
        mode="create"
        groups={groups}
        releases={releases}
        members={members}
        people={people.map((person) => person.displayName)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
