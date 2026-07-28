import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator } from "@playwright/test";
import {
  createReadOnlyClient,
  isReadOnlyServerClientAvailable,
} from "@personal-hub/supabase/read-only-server";
import { asWritableClient } from "@/lib/asWritableClient";
import { getTodayInAppTimeZone } from "@/lib/dateParams";
import { ATTENDED_TYPE_LABELS } from "@/types/attendance";
import {
  composite,
  expectContrastAtLeast,
  parseColor,
  themes,
  viewports,
} from "./contrast";

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

async function expectVividBadgeContrast(
  badge: Locator,
  pageForeground: string,
  label: string
): Promise<void> {
  const styles = await badge.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      borderWidth: style.borderTopWidth,
      color: style.color,
    };
  });
  const background = parseColor(styles.backgroundColor);
  const textColor = composite(parseColor(styles.color), background);

  expect(Number.parseFloat(styles.borderWidth), `${label}の境界幅`).toBe(0);
  expectContrastAtLeast(
    textColor,
    background,
    4.5,
    `${label} text`
  );
  if ((await badge.getAttribute("data-colorized")) === "true") {
    const inlineTextColor = await badge.evaluate(
      (element) => (element as HTMLElement).style.color
    );
    expect(inlineTextColor, `${label}のcategory hue比率`).toContain("38%");
    const semanticForeground = parseColor(pageForeground);
    const hueDistance =
      Math.abs(textColor.r - semanticForeground.r) +
      Math.abs(textColor.g - semanticForeground.g) +
      Math.abs(textColor.b - semanticForeground.b);
    expect(hueDistance, `${label}の文字色にcategory hueがありません`).toBeGreaterThan(8);
  }
  const box = await badge.boundingBox();
  if (!box) {
    throw new Error(`${label}のboundingBoxを取得できませんでした。`);
  }
  expect(box.height, `${label}はPrototypeの小型サイズ`).toBeLessThanOrEqual(20);
}

async function expectAttendancePrototypeLayout(
  row: Locator,
  label: string
): Promise<void> {
  const date = row.locator('[data-ui="attendance-date"]');
  const badgeColumn = row.locator('[data-ui="attendance-type"]');
  const badges = badgeColumn.locator('[data-ui="badge"]');
  const badge = badges.first();
  const content = row.locator('[data-ui="attendance-content"]');
  const arrow = row.locator('[data-ui="attendance-arrow"]');
  const link = row.getByRole("link");
  const [dateBox, badgeBox, badgeColumnBox, contentBox, arrowBox, linkBox] =
    await Promise.all([
    date.boundingBox(),
    badge.boundingBox(),
    badgeColumn.boundingBox(),
    content.boundingBox(),
    arrow.boundingBox(),
    link.boundingBox(),
    ]);
  if (
    !dateBox ||
    !badgeBox ||
    !badgeColumnBox ||
    !contentBox ||
    !arrowBox ||
    !linkBox
  ) {
    throw new Error(`${label}のPrototype列を計測できませんでした。`);
  }

  await expect(date).toHaveText(/^\d{2}\/\d{2}\([日月火水木金土]\)$/);
  expect(await badges.count(), `${label}: badge stack`).toBeGreaterThan(0);
  const badgeStackOrder = await badgeColumn.locator(":scope > [data-ui]").evaluateAll(
    (elements) => elements.map((element) => element.getAttribute("data-ui"))
  );
  expect(badgeStackOrder.at(-1), `${label}: 参加種別badgeはstack末尾`).toBe(
    "attendance-attended-badge"
  );
  expect(
    badgeStackOrder.slice(0, -1).every((value) => value === "attendance-group-badge"),
    `${label}: GroupBadgeは参加種別より上`
  ).toBe(true);
  expect(dateBox.x, `${label}: 日付→badge`).toBeLessThan(badgeBox.x);
  expect(arrowBox.x, `${label}: 矢印は右端`).toBeGreaterThan(contentBox.x);
  expect(badgeBox.x, `${label}: badge→内容`).toBeLessThan(contentBox.x);
  expect(
    Math.abs(dateBox.y + dateBox.height / 2 - (linkBox.y + linkBox.height / 2)),
    `${label}: 日付は行の上下中央`
  ).toBeLessThan(2);
  expect(
    Math.abs(
      badgeColumnBox.y + badgeColumnBox.height / 2 -
        (linkBox.y + linkBox.height / 2)
    ),
    `${label}: badge stackは行の上下中央`
  ).toBeLessThan(2);
  await expect(content.locator('[data-ui="badge"]')).toHaveCount(0);
  const badgeBoxes = await badges.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { centerX: box.x + box.width / 2, y: box.y };
    })
  );
  for (let index = 1; index < badgeBoxes.length; index += 1) {
    expect(
      Math.abs(badgeBoxes[index].centerX - badgeBoxes[0].centerX),
      `${label}: badge列は中央揃え`
    ).toBeLessThan(1);
    expect(badgeBoxes[index].y, `${label}: badge縦並び`).toBeGreaterThan(
      badgeBoxes[index - 1].y
    );
  }
}

async function expectTimelinePrototypeLayout(
  event: Locator,
  viewportWidth: number,
  label: string
): Promise<void> {
  const time = event.locator('[data-ui="timeline-time"]');
  const badge = event.locator('[data-ui="timeline-badge"] [data-ui="badge"]');
  const content = event.locator('[data-ui="timeline-content"]');
  const [timeBox, badgeBox, contentBox] = await Promise.all([
    time.boundingBox(),
    badge.boundingBox(),
    content.boundingBox(),
  ]);
  if (!timeBox || !badgeBox || !contentBox) {
    throw new Error(`${label}のtimeline列を計測できませんでした。`);
  }

  expect(timeBox.x, `${label}: 時刻→badge`).toBeLessThan(badgeBox.x);
  if (viewportWidth >= 360) {
    expect(badgeBox.x, `${label}: badge→内容`).toBeLessThan(contentBox.x);
    const contentCenterY = contentBox.y + contentBox.height / 2;
    expect(
      Math.abs(timeBox.y + timeBox.height / 2 - contentCenterY),
      `${label}: 時刻はcontent全体の上下中央`
    ).toBeLessThan(2);
    expect(
      Math.abs(badgeBox.y + badgeBox.height / 2 - contentCenterY),
      `${label}: badgeはcontent全体の上下中央`
    ).toBeLessThan(2);
  } else {
    expect(contentBox.x, `${label}: 2段目はevent列の左端`).toBeCloseTo(
      timeBox.x,
      0
    );
    expect(contentBox.y, `${label}: 320pxの内容fallback`).toBeGreaterThanOrEqual(
      Math.max(timeBox.y + timeBox.height, badgeBox.y + badgeBox.height)
    );
    expect(
      Math.abs(
        timeBox.y + timeBox.height / 2 -
          (badgeBox.y + badgeBox.height / 2)
      ),
      `${label}: 320pxの時刻とbadgeはrow1で上下中央`
    ).toBeLessThan(2);
  }
}

async function expectStackedPrototypeLayout(
  event: Locator,
  viewportWidth: number,
  label: string
): Promise<void> {
  const time = event.locator('[data-ui="stacked-time"]');
  const badge = event.locator('[data-ui="stacked-badge"] [data-ui="badge"]');
  const content = event.locator('[data-ui="stacked-content"]');
  const details = event.locator('[data-ui="stacked-details"]');
  const [eventBox, timeBox, badgeBox, contentBox] = await Promise.all([
    event.boundingBox(),
    time.boundingBox(),
    badge.boundingBox(),
    content.boundingBox(),
  ]);
  if (!eventBox || !timeBox || !badgeBox || !contentBox) {
    throw new Error(`${label}のDaySchedule列を計測できませんでした。`);
  }

  expect(timeBox.x, `${label}: 時間→badge`).toBeLessThan(badgeBox.x);
  const eventCenterY = eventBox.y + eventBox.height / 2;
  if (viewportWidth < 360) {
    expect(contentBox.x, `${label}: 320pxの内容は全幅`).toBeCloseTo(
      eventBox.x,
      0
    );
    expect(contentBox.y, `${label}: 320pxの内容はrow2`).toBeGreaterThanOrEqual(
      Math.max(timeBox.y + timeBox.height, badgeBox.y + badgeBox.height)
    );
    expect(
      Math.abs(
        timeBox.y + timeBox.height / 2 -
          (badgeBox.y + badgeBox.height / 2)
      ),
      `${label}: 320pxの時間とbadgeはrow1で上下中央`
    ).toBeLessThan(2);
  } else {
    expect(badgeBox.x, `${label}: badge→内容`).toBeLessThan(contentBox.x);
    expect(
      Math.abs(timeBox.y + timeBox.height / 2 - eventCenterY),
      `${label}: 時間は内容全体の上下中央`
    ).toBeLessThan(2);
    expect(
      Math.abs(badgeBox.y + badgeBox.height / 2 - eventCenterY),
      `${label}: badgeは内容全体の上下中央`
    ).toBeLessThan(2);
  }

  if ((await details.count()) === 0) {
    return;
  }
  const detailsBox = await details.boundingBox();
  if (!detailsBox) {
    throw new Error(`${label}の補足列を計測できませんでした。`);
  }
  if (viewportWidth >= 768) {
    expect(contentBox.x, `${label}: 内容→補足`).toBeLessThan(detailsBox.x);
    expect(
      Math.abs(detailsBox.y + detailsBox.height / 2 - eventCenterY),
      `${label}: 補足は4列行の上下中央`
    ).toBeLessThan(2);
  } else if (viewportWidth >= 360) {
    expect(detailsBox.x, `${label}: narrowの補足は内容列`).toBeCloseTo(
      contentBox.x,
      0
    );
    expect(detailsBox.y, `${label}: narrowの補足は内容下`).toBeGreaterThanOrEqual(
      contentBox.y + contentBox.height
    );
  } else {
    expect(detailsBox.x, `${label}: 320pxの補足は全幅`).toBeCloseTo(
      eventBox.x,
      0
    );
    expect(detailsBox.y, `${label}: 320pxの補足はrow3`).toBeGreaterThanOrEqual(
      contentBox.y + contentBox.height
    );
  }
}

test("ライブビューイングの表示名は全画面共通で短い『ライビュ』を使う", () => {
  expect(ATTENDED_TYPE_LABELS.live_viewing).toBe("ライビュ");
});

for (const theme of themes) {
  for (const viewport of viewports) {
    test(`Recent Attendance grouped surfaceを維持する（${theme} ${viewport.width}px）`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/");

      await expect(page).not.toHaveURL(/\/login/);
      const recentSection = page.locator('[data-ui="recent-attendance"]');
      const pastSection = page.locator('[data-ui="past-same-day"]');
      await expect(recentSection.getByText("自分の記録", { exact: true })).toHaveCount(0);
      await expect(pastSection.getByText("同じ日付の記録", { exact: true })).toHaveCount(0);

      const recentSurface = recentSection.locator(
        '[data-ui="recent-attendance-surface"]'
      );
      await expect(recentSurface).toBeVisible();
      await expect(recentSurface.locator(":scope > ul")).toHaveClass(/divide-y/);
      const recentRows = recentSurface.locator(
        '[data-ui="attendance-list-item"]'
      );
      expect(await recentRows.count()).toBeGreaterThan(0);
      expect(
        await recentRows.evaluateAll((rows) =>
          rows.every((row) => row.getAttribute("data-variant") === "row")
        )
      ).toBe(true);
      await expect(recentRows.first()).not.toHaveClass(/rounded-lg/);
      await expectAttendancePrototypeLayout(
        recentRows.first(),
        `Recent Attendance ${theme} ${viewport.width}px`
      );

      const footerLink = recentSurface.getByRole("link", {
        name: "参加記録をすべて見る →",
      });
      await expect(footerLink).toHaveAttribute("href", "/mypage");
      const footerBox = await footerLink.boundingBox();
      if (footerBox === null) {
        throw new Error("参加記録footer linkのboundingBoxを取得できませんでした。");
      }
      expect(footerBox.width).toBeGreaterThan(0);
      expect(footerBox.height).toBeGreaterThanOrEqual(44);

      const pastEventLists = pastSection.locator(
        '[data-ui="past-same-day-events"]'
      );
      expect(await pastEventLists.count()).toBeGreaterThan(0);
      expect(
        await pastEventLists.evaluateAll((lists) =>
          lists.every((list) => list.classList.contains("divide-y"))
        )
      ).toBe(true);

      const timelineEvents = pastSection.locator('[data-ui="timeline-event"]');
      expect(await timelineEvents.count()).toBeGreaterThan(0);
      await expectTimelinePrototypeLayout(
        timelineEvents.first(),
        viewport.width,
        `Past Same Day ${theme} ${viewport.width}px`
      );

      const stackedEvents = page.locator('[data-ui="stacked-event"]');
      expect(await stackedEvents.count()).toBeGreaterThan(0);
      await expectStackedPrototypeLayout(
        stackedEvents.first(),
        viewport.width,
        `DaySchedule ${theme} ${viewport.width}px`
      );

      const pageForeground = await page
        .locator("body")
        .evaluate((element) => getComputedStyle(element).color);
      const badges = recentSection
        .locator('[data-ui="badge"]')
        .or(pastSection.locator('[data-ui="badge"]'));
      expect(await badges.count()).toBeGreaterThan(0);
      for (let index = 0; index < (await badges.count()); index += 1) {
        await expectVividBadgeContrast(
          badges.nth(index),
          pageForeground,
          `badge[${index}] ${theme} ${viewport.width}px`
        );
      }

      const { clientWidth, scrollWidth } = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(scrollWidth).toBe(clientWidth);
    });
  }
}

test("Recent Attendance footerへkeyboardで到達しmypage / statsのcard表示を維持する", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page).not.toHaveURL(/\/login/);

  const recentSurface = page.locator('[data-ui="recent-attendance-surface"]');
  const recentRows = recentSurface.locator('[data-ui="attendance-list-item"]');
  expect(await recentRows.count()).toBeGreaterThan(0);
  const footerLink = recentSurface.getByRole("link", {
    name: "参加記録をすべて見る →",
  });

  await recentRows.last().getByRole("link").focus();
  await page.keyboard.press("Tab");
  await expect(footerLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/mypage$/);

  const mypageCards = page.locator('[data-ui="attendance-list-item"]');
  expect(await mypageCards.count()).toBeGreaterThan(0);
  expect(
    await mypageCards.evaluateAll((cards) =>
      cards.every((card) => card.getAttribute("data-variant") === "card")
    )
  ).toBe(true);
  await expect(mypageCards.first()).toHaveClass(/rounded-lg/);
  await expect(mypageCards.first()).toHaveClass(/border-border-subtle/);
  await expect(mypageCards.first()).toHaveClass(/p-3/);
  await expectAttendancePrototypeLayout(mypageCards.first(), "mypage card");

  await page.goto("/mypage/stats");
  await expect(page).not.toHaveURL(/\/login/);
  const statsCards = page.locator('[data-ui="attendance-list-item"]');
  expect(await statsCards.count()).toBeGreaterThan(0);
  expect(
    await statsCards.evaluateAll((cards) =>
      cards.every((card) => card.getAttribute("data-variant") === "card")
    )
  ).toBe(true);
  await expect(statsCards.first()).toHaveClass(/rounded-lg/);
  await expect(statsCards.first()).toHaveClass(/border-border-subtle/);
  await expect(statsCards.first()).toHaveClass(/p-3/);
  await expectAttendancePrototypeLayout(statsCards.first(), "stats card");

  const pageForeground = await page
    .locator("body")
    .evaluate((element) => getComputedStyle(element).color);
  const defaultBadges = page.locator('[data-ui="badge"]');
  expect(await defaultBadges.count()).toBeGreaterThan(0);
  for (let index = 0; index < (await defaultBadges.count()); index += 1) {
    await expectVividBadgeContrast(
      defaultBadges.nth(index),
      pageForeground,
      `stats default badge[${index}] dark`
    );
  }
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
      // attendance/performanceのSELECT policyはhas_orbit_read_role()（JWTの
      // app_metadata.roleがadmin/viewer）を要求するため（migration 045: 新規ユーザーへの
      // roleは手動付与）、付与しないとpositive controlのbounded queryが常に空配列になる。
      // sign-in前の作成時点で最小権限のviewerを付与し、roleを含むJWTを取得させる（#380 P1）
      app_metadata: { role: "viewer" },
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
