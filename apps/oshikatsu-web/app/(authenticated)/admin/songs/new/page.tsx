import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { getGroups } from "@/usecases/getGroups";
import { listMembers } from "@/usecases/listMembers";
import { SongForm } from "@/components/admin/SongForm";
import { createSongAction } from "./actions";
import type { CreateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";

export default async function NewSongPage() {
  const supabase = await createClient();

  const [groups, members] = await Promise.all([
    getGroups(createGroupRepository(supabase)),
    listMembers(createMemberRepository(supabase)),
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
        groups={groups}
        members={members}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
