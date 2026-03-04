import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createGroupRepository } from "@/repositories/groupRepository";
import { getGroups } from "@/usecases/getGroups";
import { MemberForm } from "@/components/admin/MemberForm";
import { createMemberAction } from "./actions";
import type { CreateMemberInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";

export default async function NewMemberPage() {
  const supabase = await createClient();
  const groupRepo = createGroupRepository(supabase);
  const groups = await getGroups(groupRepo);

  async function handleSubmit(
    values: CreateMemberInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createMemberAction(values);
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
