"use server";

import { createClient } from "@personal-hub/supabase/server";
import { createMemberRepository } from "@/repositories/memberRepository";
import { computeLiveRoster } from "@/usecases/computeLiveRoster";

export async function computeLiveRosterAction(
  groupIds: string[],
  date: string
): Promise<{ memberIds: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { memberIds: [] };
  }

  const repo = createMemberRepository(supabase);
  const memberIds = await computeLiveRoster(repo, groupIds, date);
  return { memberIds };
}
