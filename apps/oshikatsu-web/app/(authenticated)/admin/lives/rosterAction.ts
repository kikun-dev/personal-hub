"use server";

import { requireAdmin } from "@/lib/requireAdmin";
import { createMemberRepository } from "@/repositories/memberRepository";
import { computeLiveRoster } from "@/usecases/computeLiveRoster";

export async function computeLiveRosterAction(
  groupIds: string[],
  date: string
): Promise<{ memberIds: string[] }> {
  const supabase = await requireAdmin();

  const repo = createMemberRepository(supabase);
  const memberIds = await computeLiveRoster(repo, groupIds, date);
  return { memberIds };
}
