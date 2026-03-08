import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createGroupRepository } from "@/repositories/groupRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { getGroups } from "@/usecases/getGroups";
import { listMembers } from "@/usecases/listMembers";
import { ReleaseForm } from "@/components/admin/ReleaseForm";
import { createReleaseAction } from "./actions";
import type { CreateReleaseInput } from "@/types/release";
import type { ValidationError } from "@/types/errors";

export default async function NewReleasePage() {
  const supabase = await createClient();

  const [groups, members] = await Promise.all([
    getGroups(createGroupRepository(supabase)),
    listMembers(createMemberRepository(supabase)),
  ]);

  async function handleSubmit(
    values: CreateReleaseInput
  ): Promise<{ errors?: ValidationError[] }> {
    "use server";
    const result = await createReleaseAction(values);
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
        onSubmit={handleSubmit}
      />
    </div>
  );
}
