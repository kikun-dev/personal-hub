"use server";

import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import { createPersonRepository } from "@/repositories/personRepository";
import { revalidateOrbitPersonData } from "@/lib/revalidateOrbit";
import type { EnsurePersonRoleEntry } from "@/types/person";

// 未登録の制作陣を担当(role)付きで登録する。
// 名前一致の人物がいれば不足 role を追加し、いなければ role 付きで新規作成する。
export async function ensureStaffRolesAction(
  entries: EnsurePersonRoleEntry[]
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createPersonRepository(supabase);
  await repo.ensurePeopleRoles(entries);
  revalidateOrbitPersonData();
}
