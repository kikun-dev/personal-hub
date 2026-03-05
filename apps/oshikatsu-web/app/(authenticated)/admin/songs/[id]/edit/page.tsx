import { redirect, notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createSongRepository } from "@/repositories/songRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { getSong } from "@/usecases/getSong";
import { getGroups } from "@/usecases/getGroups";
import { listMembers } from "@/usecases/listMembers";
import { SongForm } from "@/components/admin/SongForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { updateSongAction, deleteSongAction } from "./actions";
import type { CreateSongInput } from "@/types/song";
import type { ValidationError } from "@/types/errors";

type EditSongPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditSongPage({
  params,
}: EditSongPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [song, groups, members] = await Promise.all([
    getSong(createSongRepository(supabase), id),
    getGroups(createGroupRepository(supabase)),
    listMembers(createMemberRepository(supabase)),
  ]);

  if (!song) {
    notFound();
  }

  const initialValues: CreateSongInput = {
    title: song.title,
    lyricsBy: song.lyricsBy ?? "",
    musicBy: song.musicBy ?? "",
    releaseDate: song.releaseDate ?? "",
    groupIds: song.groupIds,
    members: song.members.map((m) => ({
      memberId: m.memberId,
      position: m.position,
      positionOrder: String(m.positionOrder),
      isCenter: m.isCenter,
    })),
  };

  async function handleSubmit(
    values: CreateSongInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await updateSongAction(id, values);
    if (!result.errors) {
      redirect(`/songs/${id}`);
    }
    return result;
  }

  async function handleDelete(): Promise<{ error?: string }> {
    "use server";
    const result = await deleteSongAction(id);
    if (!result.error) {
      redirect("/admin/songs");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">楽曲を編集</h1>
        <DeleteButton
          confirmMessage={`「${song.title}」を削除しますか？`}
          onDelete={handleDelete}
        />
      </div>
      <SongForm
        mode="edit"
        initialValues={initialValues}
        groups={groups}
        members={members}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
