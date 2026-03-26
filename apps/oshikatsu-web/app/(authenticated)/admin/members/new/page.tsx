import { redirect } from "next/navigation";
import { MemberForm } from "@/components/admin/MemberForm";
import { getMemberFormMasterData } from "@/usecases/readOrbitAdminData";
import { createMemberAction } from "./actions";
import type { CreateMemberInput, MemberImageUploadInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";

export default async function NewMemberPage() {
  const { groups } = await getMemberFormMasterData();

  async function handleSubmit(
    values: CreateMemberInput,
    imageFile?: MemberImageUploadInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createMemberAction(values, imageFile);
    if (!result.errors) {
      redirect("/admin/members");
    }
    return result;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">メンバーを追加</h1>
      <MemberForm mode="create" groups={groups} onSubmit={handleSubmit} />
    </div>
  );
}
