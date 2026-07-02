import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { ReadOnlySupabaseClient } from "./types";

function getSupabaseUrl(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }

  return supabaseUrl;
}

function getServiceRoleKey(): string {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return serviceRoleKey;
}

export function isReadOnlyServerClientAvailable(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createReadOnlyClient(): ReadOnlySupabaseClient {
  // service role キーで RLS をバイパスするため、返り値は型レベルで書き込みを禁止した
  // ReadOnlySupabaseClient に絞る（フル SupabaseClient は構造的に代入可能なため
  // アサーションは不要）。実行時の権限はキー自体で決まり、実装は不変。
  return createSupabaseClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
