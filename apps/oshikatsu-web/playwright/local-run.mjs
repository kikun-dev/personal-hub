import { createClient } from "@supabase/supabase-js";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const authFile = resolve(appRoot, "playwright/.auth/local-user.json");

const LOCAL_SUPABASE_URL =
  process.env.E2E_LOCAL_SUPABASE_URL ?? "http://127.0.0.1:54321";
let localAnonKey = "";
let localServiceRoleKey = "";

const E2E_ADMIN = {
  id: "44444444-4444-4444-8444-444444444444",
  email: "e2e-admin@example.test",
  password: "local-e2e-P@ssw0rd",
};

function assertLocalSupabaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`ローカルE2EのSupabase URLが不正です: ${value}`);
  }

  const isLocal =
    url.protocol === "http:" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (!isLocal) {
    throw new Error(
      "test:e2e:local はローカルSupabase専用です。" +
        `http://127.0.0.1 または http://localhost 以外には接続しません: ${value}`
    );
  }
  return url;
}

function readLocalKeys() {
  if (
    process.env.E2E_LOCAL_SUPABASE_ANON_KEY &&
    process.env.E2E_LOCAL_SUPABASE_SERVICE_ROLE_KEY
  ) {
    return {
      anon: process.env.E2E_LOCAL_SUPABASE_ANON_KEY,
      serviceRole: process.env.E2E_LOCAL_SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  const container =
    process.env.E2E_LOCAL_SUPABASE_KONG_CONTAINER ??
    "supabase_kong_oshikatsu-web";
  let config;
  try {
    // 新しいSupabase CLIはstackごとにpublishable/secret keyを生成する。
    // 値はstdoutへ出さず、ローカルKong設定からこのNode process内だけへ読み込む。
    config = execFileSync(
      "docker",
      ["exec", container, "cat", "/home/kong/kong.yml"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    throw new Error(
      `ローカルSupabaseのAPI keyを取得できません（container: ${container}）。` +
        "stackが起動済みか確認するか、E2E_LOCAL_SUPABASE_ANON_KEY / " +
        "E2E_LOCAL_SUPABASE_SERVICE_ROLE_KEYを指定してください。",
      { cause: error }
    );
  }

  const anon = config.match(/headers\.apikey == '(sb_publishable_[^']+)'/)?.[1];
  const serviceRole = config.match(/headers\.apikey == '(sb_secret_[^']+)'/)?.[1];
  if (!anon || !serviceRole) {
    throw new Error(
      "ローカルKong設定からpublishable/secret keyを特定できません。" +
        "E2E_LOCAL_SUPABASE_ANON_KEY / E2E_LOCAL_SUPABASE_SERVICE_ROLE_KEYを指定してください。"
    );
  }
  return { anon, serviceRole };
}

function applyLocalRoleGrants() {
  const container =
    process.env.E2E_LOCAL_SUPABASE_DB_CONTAINER ??
    "supabase_db_oshikatsu-web";
  const sql = readFileSync(resolve(appRoot, "scripts/perf/grant-local-roles.sql"));
  try {
    // hostedには存在しlocal db resetでは欠ける基盤GRANTを、既存のlocal-only SQLで補う。
    // GRANTは冪等であり、URLのfail-closed検証後にDocker内DBだけへ適用する。
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        container,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { input: sql, stdio: ["pipe", "pipe", "pipe"] }
    );
  } catch (error) {
    throw new Error(
      `ローカルSupabaseのrole GRANT補完に失敗しました（container: ${container}）。`,
      { cause: error }
    );
  }
}

function chunkCookie(name, value, chunkSize = 3180) {
  if (encodeURIComponent(value).length <= chunkSize) {
    return [{ name, value }];
  }

  const chunks = [];
  for (let offset = 0; offset < value.length; offset += chunkSize) {
    chunks.push({
      name: `${name}.${chunks.length}`,
      value: value.slice(offset, offset + chunkSize),
    });
  }
  return chunks;
}

async function assertLocalStackAvailable() {
  let response;
  try {
    response = await fetch(`${LOCAL_SUPABASE_URL}/auth/v1/health`);
  } catch (error) {
    throw new Error(
      "ローカルSupabaseへ接続できません。apps/oshikatsu-web で `supabase start` を実行してください。",
      { cause: error }
    );
  }
  if (!response.ok) {
    throw new Error(
      `ローカルSupabase Authのhealth checkに失敗しました: HTTP ${response.status}`
    );
  }
}

async function ensureLocalAdminAndFixture() {
  const admin = createClient(LOCAL_SUPABASE_URL, localServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await admin.auth.admin.getUserById(E2E_ADMIN.id);
  if (existing.user) {
    const { error } = await admin.auth.admin.updateUserById(E2E_ADMIN.id, {
      email: E2E_ADMIN.email,
      password: E2E_ADMIN.password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    if (error) {
      throw new Error(`ローカルE2E adminの更新に失敗しました: ${error.message}`);
    }
  } else {
    const { error } = await admin.auth.admin.createUser({
      id: E2E_ADMIN.id,
      email: E2E_ADMIN.email,
      password: E2E_ADMIN.password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    if (error) {
      throw new Error(`ローカルE2E adminの作成に失敗しました: ${error.message}`);
    }
  }

  const fixedToday = process.env.E2E_FIXED_TODAY ?? "2026-08-23";
  const { data: performances, error: performanceError } = await admin
    .from("orbit_live_performances")
    .select("id")
    .not("performance_date", "is", null)
    .lt("performance_date", fixedToday)
    .order("performance_date", { ascending: false })
    .limit(3);
  if (performanceError || !performances || performances.length === 0) {
    throw new Error(
      "ローカルE2E用の過去公演を取得できません。`supabase db reset` でmigrationとseedを適用してください。" +
        (performanceError ? ` (${performanceError.message})` : "")
    );
  }

  const fixtureRows = performances.map(({ id }, index) => ({
    user_id: E2E_ADMIN.id,
    performance_id: id,
    attended_type: ["onsite", "live_viewing", "streaming"][index % 3],
    note: "local E2E fixture",
  }));
  const { error: attendanceError } = await admin
    .from("orbit_live_attendances")
    .upsert(fixtureRows, { onConflict: "user_id,performance_id" });
  if (attendanceError) {
    throw new Error(`ローカルE2E参加記録の準備に失敗しました: ${attendanceError.message}`);
  }
}

async function writeLocalStorageState() {
  const client = createClient(LOCAL_SUPABASE_URL, localAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: E2E_ADMIN.email,
    password: E2E_ADMIN.password,
  });
  if (error || !data.session) {
    throw new Error(
      `ローカルE2E adminのログインに失敗しました: ${error?.message ?? "sessionなし"}`
    );
  }

  const projectRef = new URL(LOCAL_SUPABASE_URL).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const encodedSession = `base64-${Buffer.from(
    JSON.stringify(data.session),
    "utf8"
  ).toString("base64url")}`;
  const expires = Math.floor(Date.now() / 1000) + 400 * 24 * 60 * 60;
  const cookies = chunkCookie(cookieName, encodedSession).map(({ name, value }) => ({
    name,
    value,
    domain: "localhost",
    path: "/",
    expires,
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }));

  await mkdir(dirname(authFile), { recursive: true, mode: 0o700 });
  await writeFile(authFile, `${JSON.stringify({ cookies, origins: [] }, null, 2)}\n`, {
    mode: 0o600,
  });
  await chmod(authFile, 0o600);
}

// 共有読み取りキャッシュ（usecases/orbitReadLoader.ts の unstable_cache）の
// エントリは .next/cache/fetch-cache にビルドをまたいで残る。cache tag は
// アプリ経由の書き込みでしか無効化されないため、`supabase db reset` や seed 追加で
// DB を直接変えても、次の `pnpm build` 後まで古い結果が返り続ける。
// 「seedを足したのに一覧が0件のまま」という形で E2E が紛らわしく落ちるので、
// ローカル実行では毎回破棄して DB の現状と一致させる（#482）。
async function clearSharedReadCache() {
  await rm(resolve(appRoot, ".next/cache/fetch-cache"), {
    force: true,
    recursive: true,
  });
}

async function main() {
  assertLocalSupabaseUrl(LOCAL_SUPABASE_URL);
  const keys = readLocalKeys();
  localAnonKey = keys.anon;
  localServiceRoleKey = keys.serviceRole;
  await assertLocalStackAvailable();
  applyLocalRoleGrants();
  await ensureLocalAdminAndFixture();
  await writeLocalStorageState();
  await clearSharedReadCache();

  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const playwrightArgs = process.argv.slice(2);
  if (playwrightArgs[0] === "--") {
    playwrightArgs.shift();
  }
  const child = spawn(
    command,
    ["exec", "playwright", "test", ...playwrightArgs],
    {
      cwd: appRoot,
      env: {
        ...process.env,
        E2E_LOCAL_SUPABASE: "1",
        NEXT_PUBLIC_SUPABASE_URL: LOCAL_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: localAnonKey,
        SUPABASE_SERVICE_ROLE_KEY: localServiceRoleKey,
      },
      stdio: "inherit",
    }
  );

  child.on("error", (error) => {
    console.error(error);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 1;
  });
}

await main();
