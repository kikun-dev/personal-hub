import { redirect } from "next/navigation";
import { createClient } from "@personal-hub/supabase/server";

const ORBIT_ROLES = ["admin", "viewer"] as const;

/**
 * Server Action / Server Component の「ユーザー別データ」入口で使う認可ガード。
 * `requireAdmin`（管理系・グローバルデータの書き込み専用、admin のみ許可）とは異なり、
 * こちらは admin / viewer のどちらでも通す。参加記録（ADR 0009）のように
 * 「本人の行動記録」を書き込む機能で使う想定で、viewer にも書き込みを許可したい場合に
 * `requireAdmin` の代わりにこれを使う。
 * - 未認証: /login へリダイレクト（従来の getUser チェックと同じ挙動）
 * - 認証済みだが admin / viewer どちらのロールでもない: トップへリダイレクト
 * `user` も返すのは、参加記録の user_id を必ずサーバー側の `auth.uid()`（getUser の結果）
 * 由来にするため（クライアント入力の user_id を信用しない、ADR 0009）。
 * 漏れても RLS（migration 047: 本人限定 + ロール判定）が書き込みを拒否する多層防御の一層。
 */
export async function requireOrbitUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role: unknown = user.app_metadata.role;
  if (typeof role !== "string" || !(ORBIT_ROLES as readonly string[]).includes(role)) {
    redirect("/");
  }

  return { supabase, user };
}
