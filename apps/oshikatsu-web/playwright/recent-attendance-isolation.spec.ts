import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  createReadOnlyClient,
  isReadOnlyServerClientAvailable,
} from "@personal-hub/supabase/read-only-server";
import { asWritableClient } from "@/lib/asWritableClient";
import { getTodayInAppTimeZone } from "@/lib/dateParams";

// #366: トップページ「最近の参加記録」（Recent Attendance）はユーザー別データ（ADR 0009）で、
// RLS（migration 047: orbit_live_attendances_select が user_id = auth.uid() で本人限定）が
// isolationを担保する前提。この前提をアプリ層のバグ（例: 誤って shared read cache 経路
// 〔service role・RLSバイパス〕へ personal data を載せてしまう等）が壊していないかを検証する。

// .env.local は Next.js 起動時のみ読み込まれ、Playwright の Node プロセスには自動で
// 入らないため、dotenv を追加せず fs.readFileSync で直接 parse する。
function readEnvLocal(): Record<string, string> {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  const content = readFileSync(envPath, "utf-8");
  const result: Record<string, string> = {};

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}

const envLocal = readEnvLocal();

function requireEnvLocal(key: string): string {
  const value = envLocal[key];
  if (!value) {
    throw new Error(`${key} が .env.local に設定されていません。`);
  }
  return value;
}

const SUPABASE_URL = requireEnvLocal("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = requireEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// @personal-hub/supabase/read-only-server の createReadOnlyClient / isReadOnlyServerClientAvailable
// は process.env を直接読むため（Next.js実行時にしか.env.localが入らない）、ここで
// 手動parseした値をbridgeする。service role keyは秘匿情報のため.env.localにはコミットしない
// 運用（無い環境ではSUPABASE_SERVICE_ROLE_KEYはbridge対象が無いのでundefinedのまま=isReadOnlyServerClientAvailable()がfalseになる）。
// 注意: process.env への代入は undefined でも文字列 "undefined" へ強制変換されるため
// （isReadOnlyServerClientAvailable() が誤って true になる）、値がある場合のみ bridge する。
if (process.env.NEXT_PUBLIC_SUPABASE_URL === undefined) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
}
if (
  process.env.SUPABASE_SERVICE_ROLE_KEY === undefined &&
  envLocal.SUPABASE_SERVICE_ROLE_KEY
) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = envLocal.SUPABASE_SERVICE_ROLE_KEY;
}

function todayDateStr(): string {
  const today = getTodayInAppTimeZone();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("未認証（anon）ではattendance行が一切露出しない（RLS deny-by-default）", async () => {
  // storageStateを使わない素のfetchで、anon Bearerのみを持つREST呼び出しを行う。
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/orbit_live_attendances?select=id&limit=1`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  // orbit_live_attendances_select policyはhas_orbit_read_role()を要求するため、
  // roleを持たないanonはHTTPエラーではなく「0件」で返る（deny-by-default）。
  expect(response.status).toBe(200);
  const body: unknown = await response.json();
  expect(body).toEqual([]);
});

test("2 user isolation: 別ユーザーの参加記録がRecent Attendanceへ漏れない", async ({
  page,
}) => {
  // user isolationの検証はviewportに依存しないため、desktop/mobileの2 projectで
  // 同じ検証データへ並行して書き込む（レース）のを避けてdesktopのみで実行する。
  test.skip(
    test.info().project.name !== "desktop",
    "同一検証データへの並行書き込みを避けるためdesktopのみ実行"
  );
  const hasServiceRoleKey = isReadOnlyServerClientAvailable();
  test.skip(
    !hasServiceRoleKey,
    "service role key が無い環境ではskip（RLS policyはauth.uid()=user_idで、" +
      "上記のanon deny-by-defaultテストがisolationの前提を担保する）"
  );
  if (!hasServiceRoleKey) {
    return;
  }

  // read-only-server は本来 shared read cache（ADR 0006）用の select 専用クライアントだが、
  // このテストではservice role自体の権限でfixtureのinsert/delete・adminユーザー作成が
  // 必要なため、asWritableClient（既存の型限定解除ヘルパー）でwrite可能な形に戻す。
  const writable = asWritableClient(createReadOnlyClient());

  // Recent Attendanceのbounded query（#366）が対象にするのと同じ形（performance_date
  // が非nullかつ過去）の公演を1件使い、実際の絞り込み条件下でもisolationが保たれることを見る。
  const { data: performances, error: performanceError } = await writable
    .from("orbit_live_performances")
    .select("id")
    .not("performance_date", "is", null)
    .lt("performance_date", todayDateStr())
    .order("performance_date", { ascending: false })
    .limit(1);

  if (performanceError || !performances || performances.length === 0) {
    throw new Error(
      `検証用の過去公演を取得できませんでした: ${performanceError?.message ?? "0件"}`
    );
  }
  const performanceId = performances[0].id as string;

  const marker = `e2e-isolation-marker-${randomUUID()}`;
  const userBEmail = `e2e-isolation-${randomUUID()}@example.invalid`;

  const { data: userBData, error: createUserError } =
    await writable.auth.admin.createUser({
      email: userBEmail,
      password: randomUUID(),
      email_confirm: true,
    });

  if (createUserError || !userBData.user) {
    throw new Error(
      `検証用ユーザーBの作成に失敗しました: ${createUserError?.message ?? "unknown error"}`
    );
  }
  const userBId: string = userBData.user.id;

  let attendanceInserted = false;

  try {
    const { error: insertError } = await writable
      .from("orbit_live_attendances")
      .insert({
        user_id: userBId,
        performance_id: performanceId,
        attended_type: "onsite",
        note: marker,
      });

    if (insertError) {
      throw new Error(`検証用attendanceの作成に失敗しました: ${insertError.message}`);
    }
    attendanceInserted = true;

    // storageStateはuser A（playwright.config.tsのauthFile）。Bのnoteがトップページの
    // どこにも表示されないことを確認する（shared read cache経路への誤混入がないか）。
    await page.goto("/");
    await expect(page.locator("body")).not.toContainText(marker);
  } finally {
    if (attendanceInserted) {
      const { error: deleteAttendanceError } = await writable
        .from("orbit_live_attendances")
        .delete()
        .eq("user_id", userBId)
        .eq("performance_id", performanceId);
      if (deleteAttendanceError) {
        console.error(
          `検証用attendanceの削除に失敗しました: ${deleteAttendanceError.message}`
        );
      }
    }

    // user削除はON DELETE CASCADEでattendance行も道連れに消えるため、上の削除が
    // 何らかの理由で失敗していてもここで最終的に片付く。
    const { error: deleteUserError } = await writable.auth.admin.deleteUser(userBId);
    if (deleteUserError) {
      console.error(`検証用ユーザーBの削除に失敗しました: ${deleteUserError.message}`);
    }
  }
});
