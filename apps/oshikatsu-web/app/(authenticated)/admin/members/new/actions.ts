"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createMember } from "@/usecases/createMember";
import type { CreateMemberInput } from "@/types/member";
import type { ValidationError } from "@/types/errors";

export async function createMemberAction(
  input: CreateMemberInput
): Promise<{ errors?: ValidationError[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createMemberRepository(supabase);
  const result = await createMember(repo, input);

  if (!result.ok) {
    return { errors: result.errors };
  }

  return {};
}
