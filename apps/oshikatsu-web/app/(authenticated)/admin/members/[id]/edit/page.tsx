import { redirect, notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { getMember } from "@/usecases/getMember";
import { getGroups } from "@/usecases/getGroups";
import { MemberForm } from "@/components/admin/MemberForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { updateMemberAction, deleteMemberAction } from "./actions";
import type { UpdateMemberInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";

type EditMemberPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditMemberPage({
  params,
}: EditMemberPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [member, groups] = await Promise.all([
    getMember(createMemberRepository(supabase), id),
    getGroups(createGroupRepository(supabase)),
  ]);

  if (!member) {
    notFound();
  }

  const initialValues: UpdateMemberInput = {
    nameJa: member.nameJa,
    nameKana: member.nameKana,
    nameEn: member.nameEn ?? "",
    dateOfBirth: member.dateOfBirth ?? "",
    bloodType: member.bloodType ?? "",
    heightCm: member.heightCm?.toString() ?? "",
    hometown: member.hometown ?? "",
    imageUrl: member.imageUrl ?? "",
    blogUrl: member.blogUrl ?? "",
    groups: member.groups.map((g) => ({
      groupId: g.groupId,
      generation: g.generation ?? "",
      joinedAt: g.joinedAt ?? "",
      graduatedAt: g.graduatedAt ?? "",
    })),
  };

  async function handleSubmit(
    values: UpdateMemberInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await updateMemberAction(id, values);
    if (!result.errors) {
      redirect(`/members/${id}`);
    }
    return result;
  }

  async function handleDelete(): Promise<{ error?: string }> {
    "use server";
    const result = await deleteMemberAction(id);
    if (!result.error) {
      redirect("/admin/members");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">メンバーを編集</h1>
        <DeleteButton
          confirmMessage={`${member.nameJa} を削除しますか？`}
          onDelete={handleDelete}
        />
      </div>
      <MemberForm
        mode="edit"
        initialValues={initialValues}
        groups={groups}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
