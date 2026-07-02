import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";
import type { SupabaseClient } from "@personal-hub/supabase";

const ADMIN_ROLE = "admin";

/**
 * Server Action / Server Component の書き込み・管理系入口で使う認可ガード。
 * - 未認証: /login へリダイレクト（従来の getUser チェックと同じ挙動）
 * - 認証済みだが admin ロールでない（viewer 等）: トップへリダイレクト
 * 漏れても RLS（migration 045/046）が書き込みを拒否する多層防御の一層。
 */
export async function requireAdmin(): Promise<SupabaseClient> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role: unknown = user.app_metadata.role;
  if (typeof role !== "string" || role !== ADMIN_ROLE) {
    redirect("/");
  }

  return supabase;
}
