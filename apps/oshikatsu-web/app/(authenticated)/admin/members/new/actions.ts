"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createMemberImageRepository } from "@/repositories/memberImageRepository";
import { createMember } from "@/usecases/createMember";
import { uploadMemberImage } from "@/usecases/uploadMemberImage";
import { removeMemberImages } from "@/usecases/removeMemberImages";
import { revalidateOrbitMemberData } from "@/lib/revalidateOrbit";
import type { CreateMemberInput, MemberImageUploadInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";
import { RepositoryError } from "@/types/errors";

async function cleanupUploadedMemberImage(
  uploadedImagePath: string | null,
  memberImageRepo: ReturnType<typeof createMemberImageRepository>
): Promise<void> {
  if (!uploadedImagePath) return;
  try {
    await removeMemberImages(memberImageRepo, [uploadedImagePath]);
  } catch {
    // 削除失敗は本処理の結果を優先し、後続で手動回収できるようにする
  }
}

export async function createMemberAction(
  input: CreateMemberInput,
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
    const nextInput: CreateMemberInput = { ...input };
    if (imageFile) {
      const uploadResult = await uploadMemberImage(memberImageRepo, {
        memberId: null,
        imageFile,
      });
      if (!uploadResult.ok) {
        return { errors: uploadResult.errors };
      }
      uploadedImagePath = uploadResult.data;
      nextInput.imageUrl = uploadedImagePath;
    }

    const result = await createMember(memberRepo, nextInput);
    if (!result.ok) {
      await cleanupUploadedMemberImage(uploadedImagePath, memberImageRepo);
      return { errors: result.errors };
    }

    revalidateOrbitMemberData();
    return {};
  } catch (e) {
    await cleanupUploadedMemberImage(uploadedImagePath, memberImageRepo);
    if (e instanceof RepositoryError) {
      console.error("createMemberAction: repository error", {
        message: e.message,
        cause: e.cause,
      });
      return {
        errors: [{ field: "_form", message: "メンバーの作成に失敗しました" }],
      };
    }
    throw e;
  }
}
