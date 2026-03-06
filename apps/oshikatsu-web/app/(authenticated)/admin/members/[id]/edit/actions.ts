"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { updateMember } from "@/usecases/updateMember";
import { deleteMember } from "@/usecases/deleteMember";
import type { UpdateMemberInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";
import {
  MEMBER_IMAGE_BUCKET,
  isMemberImageStoragePath,
} from "@/lib/memberImage";

export async function updateMemberAction(
  id: string,
  input: UpdateMemberInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createMemberRepository(supabase);

  try {
    const existing = await repo.findById(id);
    const result = await updateMember(repo, id, input);
    if (!result.ok) {
      return { errors: result.errors };
    }

    if (
      existing?.imageUrl &&
      existing.imageUrl !== input.imageUrl &&
      isMemberImageStoragePath(existing.imageUrl)
    ) {
      await supabase.storage.from(MEMBER_IMAGE_BUCKET).remove([existing.imageUrl]);
    }
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return {
        errors: [{ field: "_form", message: "メンバーが見つからないか、更新に失敗しました" }],
      };
    }
    throw e;
  }
}

export async function deleteMemberAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createMemberRepository(supabase);

  try {
    const existing = await repo.findById(id);
    await deleteMember(repo, id);

    if (existing?.imageUrl && isMemberImageStoragePath(existing.imageUrl)) {
      await supabase.storage.from(MEMBER_IMAGE_BUCKET).remove([existing.imageUrl]);
    }
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "メンバーの削除に失敗しました" };
    }
    throw e;
  }
}
