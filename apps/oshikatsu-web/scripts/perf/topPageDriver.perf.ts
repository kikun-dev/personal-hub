import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@personal-hub/supabase";
import { describe, it, expect, beforeAll } from "vitest";

import { createEventRepository } from "@/repositories/eventRepository";
import { createMemberRepository } from "@/repositories/memberRepository";
import { createLiveRepository } from "@/repositories/liveRepository";
import { createReleaseRepository } from "@/repositories/releaseRepository";
import { createSongRepository } from "@/repositories/songRepository";
import { createAttendanceRepository } from "@/repositories/attendanceRepository";
import { getTopPageContent } from "@/usecases/getTopPageContent";
import { getRecentAttendance } from "@/usecases/getRecentAttendance";

/**
 * #383: Bounded Top Page read の実DB execution plan 検証用 driver。
 * ------------------------------------------------------------
 * 実 repository / usecase コードを実 PostgREST（ローカル Supabase）経由で
 * 実行し、auto_explain（scripts/perf/setup-auto-explain.sql 適用済み）が
 * `docker logs supabase_db_oshikatsu-web` に出す実行計画を確認するための
 * driver。通常の CI / `pnpm test:unit` には含まれない
 * （vitest.perf.config.ts 経由でのみ実行される。全体の手順は README.md 参照）。
 *
 * 接続先はデフォルトでローカル Supabase の demo 固定値（ローカル専用。
 * 本番の値ではない。`npx supabase status` で表示されるものと同一）。
 * 環境変数で上書き可能。
 */
const SUPABASE_URL = process.env.PERF_SUPABASE_URL ?? "http://127.0.0.1:54321";
// ローカル Supabase CLI の demo anon key（`npx supabase status` の ANON_KEY と同一）。
const SUPABASE_ANON_KEY =
  process.env.PERF_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
// ローカル Supabase CLI の demo service_role key（同上、SERVICE_ROLE_KEY と同一）。
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.PERF_SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/**
 * 接続先がローカル Supabase であることを検証する（fail closed）。
 * この driver は service-role key で auth.admin.createUser() まで実行するため、
 * 接続先の誤設定が Constraint「production data へ write しない」の違反に直結する。
 * 許可するのは http の 127.0.0.1 / localhost のみ（port は supabase start の
 * 構成次第で変わり得るため固定しない）。https・Hosted Supabase・remote hostname は
 * 即時エラーとし、これを回避するフラグは意図的に用意しない。
 */
function assertLocalSupabaseUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `perf:driver はローカル Supabase 専用です。PERF_SUPABASE_URL が URL として不正です: ${url}`
    );
  }

  const isLocalHttp =
    parsed.protocol === "http:" &&
    (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
  if (!isLocalHttp) {
    throw new Error(
      `perf:driver はローカル Supabase 専用です。接続先は http://127.0.0.1 または ` +
        `http://localhost のみ許可されます（service-role での fixture ユーザー作成を伴うため、` +
        `Hosted Supabase 等の remote へは接続しません）: ${url}`
    );
  }
}

// service-role client 生成・ensureFixedUser より前（モジュールロード時）に検証する。
assertLocalSupabaseUrl(SUPABASE_URL);

// supabase/perf-fixtures/*.sql と共有する固定値。fixture 側で auth.users /
// auth.identities を直接 INSERT しているため、通常このファイルの
// ensureFixedUser() は no-op になる（fixture 未適用など想定外の状態への
// フォールバックとしてのみ動作する。README「判断・妥協した点」参照）。
const FIXED_PASSWORD = "perf-fixture-P@ssw0rd";
type FixedUser = { id: string; email: string };
const HEAVY_USER: FixedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "perf-heavy@example.test",
};
const LIGHT_USER: FixedUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "perf-light@example.test",
};
const ZERO_USER: FixedUser = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "perf-zero@example.test",
};

type Scenario = {
  name: string;
  year: number;
  month: number;
  day: number;
  todayYear: number;
  todayMonth: number;
  todayDay: number;
};

// 仮想の today = 2026-07-19（fixture と共有する前提日付）。
const SCENARIOS: Scenario[] = [
  {
    name: "today",
    year: 2026,
    month: 7,
    day: 19,
    todayYear: 2026,
    todayMonth: 7,
    todayDay: 19,
  },
  {
    name: "same-month-selected",
    year: 2026,
    month: 7,
    day: 5,
    todayYear: 2026,
    todayMonth: 7,
    todayDay: 19,
  },
  {
    name: "window-external-selected",
    year: 2024,
    month: 3,
    day: 10,
    todayYear: 2026,
    todayMonth: 7,
    todayDay: 19,
  },
];

/**
 * 固定 UUID のユーザーが存在することを保証する（idempotent）。
 * 通常は fixture 側で作成済みのため getUserById がヒットして早期returnする。
 *
 * fallback の createUser 呼び出しは、@supabase/supabase-js 2.110 時点の
 * AdminUserAttributes 型には `id`（カスタムUUID指定）が公開されていないが、
 * GoTrue の admin API 自体は `id` 指定でのユーザー作成をサポートしている
 * （ローカル環境で実機確認済み）。fixture の attendance 行が参照する固定
 * UUID と一致させる必要があるため、意図的に型を緩めてリクエストボディへ
 * `id` を含める。
 */
async function ensureFixedUser(
  adminClient: SupabaseClient<Database>,
  user: FixedUser
): Promise<void> {
  const { data: existing, error: getError } =
    await adminClient.auth.admin.getUserById(user.id);
  if (!getError && existing.user) {
    return;
  }

  type CreateUserBody = Parameters<
    typeof adminClient.auth.admin.createUser
  >[0];
  const body = {
    id: user.id,
    email: user.email,
    password: FIXED_PASSWORD,
    email_confirm: true,
    app_metadata: { role: "viewer" },
  } as CreateUserBody & { id: string };

  const { error: createError } = await adminClient.auth.admin.createUser(body);
  if (createError) {
    throw new Error(
      `固定ユーザー(${user.email})の作成に失敗しました: ${createError.message}`
    );
  }
}

/**
 * シナリオの区切りを DB ログ側にも残すためのマーカー query。
 * PostgREST は任意の生SQLを実行するエンドポイントを持たないため、
 * 存在しない値で実テーブルを select し、そのフィルタ値（ラベル文字列）が
 * auto_explain の "Query Parameters" 行に残ることを利用する
 * （0件ヒットで結果自体は空になるが、docker logs 上でこのラベル文字列を
 * grep すればシナリオの境目と対応する実行計画を特定できる）。
 */
async function logScenarioMarker(
  serviceClient: SupabaseClient<Database>,
  label: string
): Promise<void> {
  const marker = `__perf_scenario_marker__${label}__`;
  console.log(`=== SCENARIO MARKER: ${marker} ===`);
  await serviceClient
    .from("orbit_event_types")
    .select("id")
    .eq("name", marker)
    .maybeSingle();
}

async function runTopPageScenario(
  client: SupabaseClient<Database>,
  serviceClient: SupabaseClient<Database>,
  scenario: Scenario
): Promise<void> {
  const label = `topPage:${scenario.name}`;
  console.log(`=== SCENARIO: ${label} start ===`);
  await logScenarioMarker(serviceClient, `${label}:start`);

  const eventRepo = createEventRepository(client);
  const memberRepo = createMemberRepository(client);
  const liveRepo = createLiveRepository(client);
  const releaseRepo = createReleaseRepository(client);
  const songRepo = createSongRepository(client);

  const content = await getTopPageContent(
    eventRepo,
    memberRepo,
    liveRepo,
    releaseRepo,
    songRepo,
    scenario.year,
    scenario.month,
    scenario.day,
    scenario.todayYear,
    scenario.todayMonth,
    scenario.todayDay
  );

  console.log(
    `[${label}] monthEvents=${content.monthEvents.length} ` +
      `selectedDateEvents=${content.selectedDateEvents.length} ` +
      `onThisDayEvents=${content.onThisDayEvents.length} ` +
      `todayEvents=${content.todayEvents.length} ` +
      `nextEvents=${content.nextEvents.length}`
  );

  // Next Events rail は常に上限4件（getTopPageContent の NEXT_EVENTS_LIMIT）。
  expect(content.nextEvents.length).toBeLessThanOrEqual(4);

  await logScenarioMarker(serviceClient, `${label}:end`);
  console.log(`=== SCENARIO: ${label} end ===`);
}

describe("Top Page bounded read driver (#383)", () => {
  let heavyClient: SupabaseClient<Database>;
  let lightClient: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;

  beforeAll(async () => {
    serviceClient = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    await ensureFixedUser(serviceClient, HEAVY_USER);
    await ensureFixedUser(serviceClient, LIGHT_USER);
    await ensureFixedUser(serviceClient, ZERO_USER);

    heavyClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: heavySignInError } =
      await heavyClient.auth.signInWithPassword({
        email: HEAVY_USER.email,
        password: FIXED_PASSWORD,
      });
    if (heavySignInError) {
      throw new Error(
        `heavy user のサインインに失敗しました: ${heavySignInError.message}`
      );
    }

    lightClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: lightSignInError } =
      await lightClient.auth.signInWithPassword({
        email: LIGHT_USER.email,
        password: FIXED_PASSWORD,
      });
    if (lightSignInError) {
      throw new Error(
        `light user のサインインに失敗しました: ${lightSignInError.message}`
      );
    }
  });

  it.each(SCENARIOS)(
    "getTopPageContent シナリオ: $name",
    async (scenario) => {
      await runTopPageScenario(heavyClient, serviceClient, scenario);
    }
  );

  it("getRecentAttendance（heavy user、bounded確認）", async () => {
    const label = "attendance:heavy";
    console.log(`=== SCENARIO: ${label} start ===`);
    await logScenarioMarker(serviceClient, `${label}:start`);

    const repo = createAttendanceRepository(heavyClient);
    const result = await getRecentAttendance(repo);

    console.log(
      `[${label}] entries=${result.entries.length} hasAnyPastAttendance=${result.hasAnyPastAttendance}`
    );
    // findRecentForUser の limit（RECENT_ATTENDANCE_LIMIT=3）を超えないこと。
    expect(result.entries.length).toBeLessThanOrEqual(3);
    expect(result.hasAnyPastAttendance).toBe(true);

    await logScenarioMarker(serviceClient, `${label}:end`);
    console.log(`=== SCENARIO: ${label} end ===`);
  });

  it("getRecentAttendance（light user、selectivity比較用）", async () => {
    const label = "attendance:light";
    console.log(`=== SCENARIO: ${label} start ===`);
    await logScenarioMarker(serviceClient, `${label}:start`);

    const repo = createAttendanceRepository(lightClient);
    const result = await getRecentAttendance(repo);

    console.log(
      `[${label}] entries=${result.entries.length} hasAnyPastAttendance=${result.hasAnyPastAttendance}`
    );
    expect(result.entries.length).toBeLessThanOrEqual(3);

    await logScenarioMarker(serviceClient, `${label}:end`);
    console.log(`=== SCENARIO: ${label} end ===`);
  });
});
