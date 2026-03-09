import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createPersonRepository } from "@/repositories/personRepository";
import { listMembers } from "@/usecases/listMembers";
import { listReleases } from "@/usecases/listReleases";
import { listPeople } from "@/usecases/listPeople";
import { SongForm } from "@/components/admin/SongForm";
import { createSongAction } from "./actions";
import type { CreateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";

export default async function NewSongPage() {
  const supabase = await createClient();

  const [releases, members, people] = await Promise.all([
    listReleases(createReleaseRepository(supabase)),
    listMembers(createMemberRepository(supabase)),
    listPeople(createPersonRepository(supabase)),
  ]);

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
        releases={releases}
        members={members}
        people={people.map((person) => person.displayName)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
