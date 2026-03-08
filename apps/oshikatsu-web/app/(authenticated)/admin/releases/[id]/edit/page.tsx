import { redirect, notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { getRelease } from "@/usecases/getRelease";
import { getGroups } from "@/usecases/getGroups";
import { listMembers } from "@/usecases/listMembers";
import { ReleaseForm } from "@/components/admin/ReleaseForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { updateReleaseAction, deleteReleaseAction } from "./actions";
import type { CreateReleaseInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";

type EditReleasePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditReleasePage({
  params,
}: EditReleasePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [release, groups, members] = await Promise.all([
    getRelease(createReleaseRepository(supabase), id),
    getGroups(createGroupRepository(supabase)),
    listMembers(createMemberRepository(supabase)),
  ]);

  if (!release) {
    notFound();
  }

  const initialValues: CreateReleaseInput = {
    title: release.title,
    groupId: release.groupId,
    releaseType: release.releaseType,
    numbering: release.numbering ? String(release.numbering) : "",
    releaseDate: release.releaseDate ?? "",
    artworkPath: release.artworkPath ?? "",
    participantMemberIds: release.participantMemberIds,
    bonusVideos: release.bonusVideos.map((bonus) => ({
      edition: bonus.edition,
      title: bonus.title,
      description: bonus.description ?? "",
    })),
  };

  async function handleSubmit(
    values: CreateReleaseInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await updateReleaseAction(id, values);
    if (!result.errors) {
      redirect("/admin/releases");
    }
    return result;
  }

  async function handleDelete(): Promise<{ error?: string }> {
    "use server";
    const result = await deleteReleaseAction(id);
    if (!result.error) {
      redirect("/admin/releases");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">リリースを編集</h1>
        <DeleteButton
          confirmMessage={`「${release.title}」を削除しますか？`}
          onDelete={handleDelete}
        />
      </div>
      <ReleaseForm
        mode="edit"
        initialValues={initialValues}
        groups={groups}
        members={members}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
