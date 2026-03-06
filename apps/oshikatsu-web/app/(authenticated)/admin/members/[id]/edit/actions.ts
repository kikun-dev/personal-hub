"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createMemberImageRepository } from "@/repositories/memberImageRepository";
import { updateMember } from "@/usecases/updateMember";
import { deleteMember } from "@/usecases/deleteMember";
import { uploadMemberImage } from "@/usecases/uploadMemberImage";
import { removeMemberImages } from "@/usecases/removeMemberImages";
import type { UpdateMemberInput, MemberImageUploadInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

async function cleanupMemberImages(
  memberImageRepo: ReturnType<typeof createMemberImageRepository>,
  imagePaths: Array<string | null | undefined>
): Promise<void> {
  try {
    await removeMemberImages(memberImageRepo, imagePaths);
  } catch {
    // 削除失敗は本処理の結果を優先し、後続で手動回収できるようにする
  }
}

export async function updateMemberAction(
  id: string,
  input: UpdateMemberInput,
  imageFile?: MemberImageUploadInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const memberRepo = createMemberRepository(supabase);
  const memberImageRepo = createMemberImageRepository(supabase);
  let uploadedImagePath: string | null = null;

  try {
    const existing = await memberRepo.findById(id);
    const nextInput: UpdateMemberInput = { ...input };

    if (imageFile) {
      const uploadResult = await uploadMemberImage(memberImageRepo, {
        memberId: id,
        imageFile,
      });
      if (!uploadResult.ok) {
        return { errors: uploadResult.errors };
      }
      uploadedImagePath = uploadResult.data;
      nextInput.imageUrl = uploadedImagePath;
    }

    const result = await updateMember(memberRepo, id, nextInput);
    if (!result.ok) {
      await cleanupMemberImages(memberImageRepo, [uploadedImagePath]);
      return { errors: result.errors };
    }

    if (existing?.imageUrl && existing.imageUrl !== nextInput.imageUrl) {
      await cleanupMemberImages(memberImageRepo, [existing.imageUrl]);
    }
    return {};
  } catch (e) {
    await cleanupMemberImages(memberImageRepo, [uploadedImagePath]);

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

  const memberRepo = createMemberRepository(supabase);
  const memberImageRepo = createMemberImageRepository(supabase);

  try {
    const existing = await memberRepo.findById(id);
    await deleteMember(memberRepo, id);

    await cleanupMemberImages(memberImageRepo, [existing?.imageUrl]);
    return {};
  } catch (e) {
    if (e instanceof RepositoryError) {
      return { error: "メンバーの削除に失敗しました" };
    }
    throw e;
  }
}
