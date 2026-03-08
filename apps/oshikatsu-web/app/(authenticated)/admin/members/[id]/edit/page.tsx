import { redirect, notFound } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createGroupRepository } from "@/repositories/groupRepository";
import { getMember } from "@/usecases/getMember";
import { getGroups } from "@/usecases/getGroups";
import { MemberForm } from "@/components/admin/MemberForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { updateMemberAction, deleteMemberAction } from "./actions";
import type { UpdateMemberInput, MemberImageUploadInput } from "@/types/member";
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
    callName: member.callName ?? "",
    penlightColor1: member.penlightColor1 ?? "",
    penlightColor2: member.penlightColor2 ?? "",
    heightCm: member.heightCm?.toString() ?? "",
    hometown: member.hometown ?? "",
    memo: member.memo ?? "",
    imageUrl: member.imageUrl ?? "",
    blogUrl: member.blogUrl ?? "",
    blogHashtag: member.blogHashtag ?? "",
    talkAppName: member.talkAppName ?? "",
    talkAppUrl: member.talkAppUrl ?? "",
    talkAppHashtag: member.talkAppHashtag ?? "",
    groups: member.groups.map((g) => ({
      groupId: g.groupId,
      generation: g.generation ?? "",
      joinedAt: g.joinedAt ?? "",
      graduatedAt: g.graduatedAt ?? "",
    })),
    sns: member.sns.map((sns) => ({
      snsType: sns.snsType,
      displayName: sns.displayName,
      url: sns.url,
      hashtag: sns.hashtag,
    })),
    histories: member.histories.map((history) => ({
      date: history.date,
      event: history.event,
      note: history.note,
    })),
  };

  async function handleSubmit(
    values: UpdateMemberInput,
    imageFile?: MemberImageUploadInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await updateMemberAction(id, values, imageFile);
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
