import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createSongRepository } from "@/repositories/songRepository";
import { createPersonRepository } from "@/repositories/personRepository";
import { getGroups } from "@/usecases/getGroups";
import { listMembers } from "@/usecases/listMembers";
import { listSongOptions } from "@/usecases/listSongOptions";
import { listPeople } from "@/usecases/listPeople";
import { ReleaseForm } from "@/components/admin/ReleaseForm";
import { createReleaseAction } from "./actions";
import type { CreateReleaseInput, ReleaseImageUploadInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";

export default async function NewReleasePage() {
  const supabase = await createClient();

  const [groups, members, songOptions, people] = await Promise.all([
    getGroups(createGroupRepository(supabase)),
    listMembers(createMemberRepository(supabase)),
    listSongOptions(createSongRepository(supabase)),
    listPeople(createPersonRepository(supabase)),
  ]);

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
