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
  // positive control（Bとして同じbounded queryを実行する）でsign-inに使うため保持する
  const userBPassword = randomUUID();

  const { data: userBData, error: createUserError } =
    await writable.auth.admin.createUser({
      email: userBEmail,
      password: userBPassword,
      email_confirm: true,
    });

  if (createUserError || !userBData.user) {
    throw new Error(
      `検証用ユーザーBの作成に失敗しました: ${createUserError?.message ?? "unknown error"}`
    );
  }
  const userBId: string = userBData.user.id;

  let attendanceInserted = false;
  // #380 P2: cleanup失敗（共有Supabaseへの一時user/fixture残留）を握り潰さないための収集先。
  // finally内でthrowすると本体assertの失敗をmaskするため、finally後のassertで可視化する
  const cleanupErrors: string[] = [];

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

    // positive control（#380 P1）: 所有者であるB自身がRecent Attendanceと同形のbounded query
    // （!inner + 過去日filter + 降順order + limit）でmarker行を取得**できる**ことを先に確認する。
    // これが通らない場合はquery/fixture自体が壊れており、後段の「Aに見えない」assertが
    // 空振りで成立してしまうため、分離の検証として無効になる。
    const tokenResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userBEmail, password: userBPassword }),
      }
    );
    expect(tokenResponse.status).toBe(200);
    const tokenBody = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenBody.access_token) {
      throw new Error("検証用ユーザーBのaccess tokenを取得できませんでした。");
    }

    const boundedQuery =
      `${SUPABASE_URL}/rest/v1/orbit_live_attendances` +
      `?select=note,orbit_live_performances!inner(performance_date)` +
      `&orbit_live_performances.performance_date=not.is.null` +
      `&orbit_live_performances.performance_date=lt.${todayDateStr()}` +
      `&order=orbit_live_performances(performance_date).desc&limit=3`;
    const userBResponse = await fetch(boundedQuery, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${tokenBody.access_token}`,
      },
    });
    expect(userBResponse.status).toBe(200);
    const userBRows = (await userBResponse.json()) as { note: string | null }[];
    expect(userBRows.some((row) => row.note === marker)).toBe(true);

    // storageStateはuser A（playwright.config.tsのauthFile）。Bのnoteがトップページの
    // どこにも表示されないことを確認する（shared read cache経路への誤混入がないか）。
    // #380 P1: session失効等で/loginへredirectされてもmarker不在で偽成功してしまうため、
    // 「Aとして認証済みでRecent Attendanceが実際に描画されている」ことを先にassertする。
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "最近の参加記録" })
    ).toBeVisible();
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
      // attendance削除の失敗はCASCADEで救済されるためconsole.errorに留めるが、
      // user削除の失敗は残留が確定するためテスト失敗として可視化する（#380 P2）
      const message = `検証用ユーザーBの削除に失敗しました（共有DBへ残留）: ${deleteUserError.message}`;
      cleanupErrors.push(message);
      console.error(message);
    }
  }

  // 本体assertが成功した場合のみ到達する（本体が失敗した場合はその失敗が優先され、
  // cleanup失敗はconsole.errorへ記録済み）。user残留があればここで失敗させる
  expect(cleanupErrors).toEqual([]);
});
