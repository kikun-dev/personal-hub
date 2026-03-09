import { redirect, notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createSongRepository } from "@/repositories/songRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createPersonRepository } from "@/repositories/personRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { getSong } from "@/usecases/getSong";
import { listMembers } from "@/usecases/listMembers";
import { listReleases } from "@/usecases/listReleases";
import { listPeople } from "@/usecases/listPeople";
import { getGroups } from "@/usecases/getGroups";
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

  const [song, releases, members, people, groups] = await Promise.all([
    getSong(createSongRepository(supabase), id),
    listReleases(createReleaseRepository(supabase)),
    listMembers(createMemberRepository(supabase)),
    listPeople(createPersonRepository(supabase)),
    getGroups(createGroupRepository(supabase)),
  ]);

  if (!song) {
    notFound();
  }

  const initialValues: CreateSongInput = {
    title: song.title,
    groupId: song.groupId,
    durationSeconds: song.durationSeconds ? String(song.durationSeconds) : "",
    releaseLinks: song.releases.map((release) => ({
      releaseId: release.releaseId,
      trackNumber: String(release.trackNumber),
    })),
    lyricsPeople: song.credits
      .filter((credit) => credit.role === "lyrics")
      .map((credit) => credit.personName)
      .join(", "),
    musicPeople: song.credits
      .filter((credit) => credit.role === "music")
      .map((credit) => credit.personName)
      .join(", "),
    arrangementPeople: song.credits
      .filter((credit) => credit.role === "arrangement")
      .map((credit) => credit.personName)
      .join(", "),
    choreographyPeople: song.credits
      .filter((credit) => credit.role === "choreography")
      .map((credit) => credit.personName)
      .join(", "),
    formationRows: song.formationRows.map((row) => ({
      memberCount: String(row.memberCount),
      memberIds: row.members.map((member) => member.memberId),
    })),
    mv: {
      url: song.mv?.url ?? "",
      directorName: song.mv?.directorName ?? "",
      location: song.mv?.location ?? "",
      publishedOn: song.mv?.publishedOn ?? "",
      memo: song.mv?.memo ?? "",
    },
    costumes: song.costumes.map((costume) => ({
      stylistName: costume.stylistName,
      imagePath: costume.imagePath,
      note: costume.note ?? "",
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
        releases={releases}
        members={members}
        people={people.map((person) => person.displayName)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
