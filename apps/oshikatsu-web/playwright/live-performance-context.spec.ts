import { expect, test, type Locator, type Page } from "@playwright/test";
import { focusWithKeyboard } from "./contrast";
import { installTrackedRoute } from "./trackedRoute";

const TARGET_LIVE_NAME = /乃木坂46 真夏の全国ツアー2026/;
const NONEXISTENT_PERFORMANCE_ID = "77777777-7777-4777-8777-777777777777";

function viewportForProject(projectName: string): { width: number; height: number } {
  return projectName === "mobile"
    ? { width: 390, height: 844 }
    : { width: 1440, height: 1000 };
}

async function resolveTargetLiveHref(page: Page): Promise<string> {
  await page.goto("/lives");
  const liveLink = page.getByRole("link", { name: TARGET_LIVE_NAME }).first();
  await expect(liveLink).toBeVisible();
  const href = await liveLink.getAttribute("href");
  if (href === null) {
    throw new Error("公演context検証用ライブのhrefを取得できませんでした。");
  }
  return href;
}

function performanceLinks(page: Page, liveHref: string): Locator {
  return page.locator(`main a[href^="${liveHref}?performance="]`);
}

type PerformanceExpectation = {
  href: string;
  performanceId: string;
  scheduleLabel: string;
  areaLabel: string;
};

function compactText(value: string | null): string {
  return (value ?? "").replace(/\s+/g, "");
}

async function readPerformanceExpectation(
  link: Locator
): Promise<PerformanceExpectation> {
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  const scheduleLabel = (await link.textContent())?.trim() ?? "";
  if (href === null || scheduleLabel.length === 0) {
    throw new Error("日程Linkの遷移先または表示ラベルを取得できませんでした。");
  }
  const performanceId = new URL(href, "http://localhost").searchParams.get(
    "performance"
  );
  if (performanceId === null) {
    throw new Error("日程Linkにperformance IDがありません。");
  }

  const venueCard = link.locator(
    "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' rounded-lg ')][1]"
  );
  const areaLabel =
    (await venueCard.locator(":scope > p").first().textContent())?.trim() ?? "";

  return { href, performanceId, scheduleLabel, areaLabel };
}

async function expectPrimaryMatches(
  page: Page,
  expected: PerformanceExpectation
): Promise<void> {
  const section = page.locator("section", {
    has: page.getByRole("heading", { level: 2, name: "この公演" }),
  });
  await expect(section).toBeVisible();
  const text = compactText(await section.textContent());
  expect(text).toContain(compactText(expected.scheduleLabel));
  if (expected.areaLabel.length > 0) {
    expect(text).toContain(compactText(expected.areaLabel));
  }
}

async function navigateWithGlobalPending(
  page: Page,
  link: Locator,
  expectedHref: string
): Promise<void> {
  await focusWithKeyboard(page, link, { maxTabs: 80 });
  await expect(link).toBeFocused();
  const linkBox = await link.boundingBox();
  expect(linkBox?.height).toBeGreaterThanOrEqual(44);
  expect(
    await link.evaluate((element) => getComputedStyle(element).outlineWidth)
  ).toBe("2px");

  const currentOrigin = new URL(page.url()).origin;
  let releaseRequest: () => void = () => undefined;
  let isReleased = false;
  const gate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  const release = () => {
    if (isReleased) return;
    isReleased = true;
    releaseRequest();
  };
  const disposeRoute = await installTrackedRoute(page, "**/*", async (route) => {
    const request = route.request();
    if (
      request.method() === "GET" &&
      new URL(request.url()).origin === currentOrigin
    ) {
      await gate;
    }
    await route.continue();
  });

  try {
    await page.keyboard.press("Enter");
    const pending = page.getByRole("status", { name: "画面遷移中" });
    await expect(pending).toBeVisible();
    const pendingBox = await pending.boundingBox();
    expect(linkBox).not.toBeNull();
    expect(pendingBox).not.toBeNull();
    if (linkBox !== null && pendingBox !== null) {
      const isOverlapping =
        linkBox.x < pendingBox.x + pendingBox.width &&
        linkBox.x + linkBox.width > pendingBox.x &&
        linkBox.y < pendingBox.y + pendingBox.height &&
        linkBox.y + linkBox.height > pendingBox.y;
      expect(isOverlapping).toBe(false);
    }
    await expectNoHorizontalOverflow(page);
    release();
    await expect
      .poll(() => {
        const url = new URL(page.url());
        return `${url.pathname}${url.search}`;
      })
      .toBe(expectedHref);
  } finally {
    release();
    await disposeRoute();
  }
}

async function resolveCrossLivePerformanceId(
  page: Page,
  targetLiveHref: string
): Promise<string> {
  await page.goto("/lives");
  const liveHrefs = await page
    .locator('a[data-ui="live-card"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .filter((href): href is string => href !== null)
    );

  for (const liveHref of liveHrefs) {
    if (liveHref === targetLiveHref) continue;
    await page.goto(liveHref);
    const selectionHref = await performanceLinks(page, liveHref)
      .first()
      .getAttribute("href");
    if (selectionHref === null) continue;
    const performanceId = new URL(selectionHref, page.url()).searchParams.get(
      "performance"
    );
    if (performanceId !== null) return performanceId;
  }

  throw new Error("別Liveに属するperformance IDを取得できませんでした。");
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
  ).toBe(false);
}

test.beforeEach(async ({ page }, testInfo) => {
  await page.setViewportSize(viewportForProject(testInfo.project.name));
});

test("bare日程Linkをkeyboardで選び、performance単独contextをreload後も復元できる", async ({
  page,
}) => {
  const liveHref = await resolveTargetLiveHref(page);
  await page.goto(liveHref);

  await expect(page.getByRole("heading", { name: "この公演" })).toHaveCount(0);
  await expect(page.getByTestId("live-performance-carousel")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "← ライブ一覧へ戻る" })
  ).toBeVisible();

  const performanceLink = performanceLinks(page, liveHref).nth(1);
  const expected = await readPerformanceExpectation(performanceLink);
  const firstPerformanceHref = await performanceLinks(page, liveHref)
    .first()
    .getAttribute("href");
  expect(expected.href).not.toBe(firstPerformanceHref);

  await test.step("keyboard navigation", async () => {
    await navigateWithGlobalPending(page, performanceLink, expected.href);
    await expectPrimaryMatches(page, expected);
  });

  await expect(page.getByTestId("live-performance-carousel")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await test.step("reload", async () => {
    await page.reload();
    await expectPrimaryMatches(page, expected);
    await expect(
      page.getByRole("link", { name: "← ライブ全体へ戻る" })
    ).toHaveAttribute("href", liveHref);
  });

  await test.step("direct visit", async () => {
    await page.goto(liveHref);
    await page.goto(expected.href);
    await expectPrimaryMatches(page, expected);
  });

  await page.getByRole("link", { name: "← ライブ全体へ戻る" }).click();
  await expect(page).toHaveURL(new RegExp(`${liveHref.replaceAll("/", "\\/")}$`));
  await expect(page.getByTestId("live-performance-carousel")).toBeVisible();
  await expect(page.getByRole("heading", { name: "この公演" })).toHaveCount(0);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`TourOverviewの別公演Linkがinteraction contractを満たす（motion: ${reducedMotion}）`, async ({
    page,
  }) => {
    const liveHref = await resolveTargetLiveHref(page);
    await page.goto(liveHref);
    const initial = await readPerformanceExpectation(
      performanceLinks(page, liveHref).nth(1)
    );
    const target = await readPerformanceExpectation(
      performanceLinks(page, liveHref).nth(2)
    );
    expect(target.performanceId).not.toBe(initial.performanceId);

    await page.emulateMedia({ reducedMotion });
    await page.goto(initial.href);
    await expectPrimaryMatches(page, initial);

    const tourLink = page.locator(`main a[href="${target.href}"]`);
    await expect(tourLink).toHaveCount(1);
    await expect(tourLink).toHaveAttribute("href", target.href);
    await navigateWithGlobalPending(page, tourLink, target.href);
    await expectPrimaryMatches(page, target);
    await expectNoHorizontalOverflow(page);
  });
}

test("invalid・nonexistent・cross-live IDはbare overviewへfallbackする", async ({
  page,
}) => {
  const liveHref = await resolveTargetLiveHref(page);
  const crossLivePerformanceId = await resolveCrossLivePerformanceId(page, liveHref);
  const invalidCases = [
    { label: "malformed", value: "not-a-uuid" },
    { label: "nonexistent", value: NONEXISTENT_PERFORMANCE_ID },
    { label: "cross-live", value: crossLivePerformanceId },
  ];

  for (const invalidCase of invalidCases) {
    await test.step(invalidCase.label, async () => {
      await page.goto(`${liveHref}?performance=${invalidCase.value}`);
      await expect(page.getByRole("heading", { name: "この公演" })).toHaveCount(0);
      await expect(page.getByTestId("live-performance-carousel")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "← ライブ一覧へ戻る" })
      ).toBeVisible();
    });
  }

  const validSelectionHref = await performanceLinks(page, liveHref)
    .first()
    .getAttribute("href");
  if (validSelectionHref === null) {
    throw new Error("格下げ防止検証用のperformance IDを取得できませんでした。");
  }
  const validPerformanceId = new URL(
    validSelectionHref,
    page.url()
  ).searchParams.get("performance");
  await test.step("valid performance + invalid date", async () => {
    await page.goto(
      `${liveHref}?date=invalid-date&performance=${validPerformanceId}`
    );
    await expect(page.getByRole("heading", { name: "この公演" })).toHaveCount(0);
    await expect(page.getByTestId("live-performance-carousel")).toBeVisible();
  });
});

test("Topのdate + performance導線は対象公演と選択日への戻り先を維持する", async ({
  page,
}) => {
  await page.goto("/");
  const topLiveLink = page
    .locator('main a[href^="/lives/"][href*="?date="][href*="&performance="]')
    .first();
  await expect(topLiveLink).toBeVisible();
  const href = await topLiveLink.getAttribute("href");
  if (href === null) {
    throw new Error("Topのdate + performance導線を取得できませんでした。");
  }
  const url = new URL(href, page.url());
  const date = url.searchParams.get("date");
  const performanceId = url.searchParams.get("performance");
  if (date === null || performanceId === null) {
    throw new Error("Top導線にdateまたはperformanceがありません。");
  }
  const [, month, day] = date.split("-").map(Number);
  const liveHref = url.pathname;

  await page.goto(liveHref);
  const expected = await readPerformanceExpectation(
    page.locator(
      `main a[href="${liveHref}?performance=${performanceId}"]`
    )
  );

  await page.goto("/");
  const verifiedTopLiveLink = page.locator(`main a[href="${href}"]`);
  await expect(verifiedTopLiveLink).toHaveCount(1);
  await verifiedTopLiveLink.click();
  await expect
    .poll(() => {
      const currentUrl = new URL(page.url());
      return `${currentUrl.pathname}${currentUrl.search}`;
    })
    .toBe(href);
  await expectPrimaryMatches(page, expected);
  await expect(
    page.getByRole("link", { name: `← ${month}/${day}の出来事へ戻る` })
  ).toHaveAttribute("href", `/?year=${date.slice(0, 4)}&month=${month}&day=${day}`);
  await expectNoHorizontalOverflow(page);
});

test("Setlistからroute上のperformance contextを復元する", async ({ page }) => {
  const liveHref = await resolveTargetLiveHref(page);
  await page.goto(liveHref);
  const carouselGroups = page.getByTestId("live-performance-carousel").getByRole("group");
  const groupCount = await carouselGroups.count();
  let performanceId: string | null = null;

  for (let index = 0; index < groupCount; index += 1) {
    const group = carouselGroups.nth(index);
    if ((await group.locator("ol").count()) === 0) continue;
    const setlistHref = await group
      .getByRole("link", { name: "詳細を見る →" })
      .getAttribute("href");
    performanceId =
      setlistHref?.match(/\/performances\/([0-9a-f-]{36})\/setlist$/i)?.[1] ??
      null;
    if (performanceId !== null) break;
  }
  expect(performanceId, "セットリストを持つ公演が必要です").not.toBeNull();
  if (performanceId === null) return;

  await page.goto(`${liveHref}?performance=${performanceId}`);
  const liveName = (await page.getByRole("heading", { level: 1 }).textContent())?.trim();
  if (!liveName) {
    throw new Error("親Live導線のラベル検証用ライブ名を取得できませんでした。");
  }

  const thisPerformance = page.locator("section", {
    has: page.getByRole("heading", { level: 2, name: "この公演" }),
  });
  const setlistLink = thisPerformance.getByRole("link", { name: "詳細を見る →" });
  await expect(setlistLink).toBeVisible();
  await setlistLink.click();

  const parentLiveLink = page.getByRole("link", { name: `← ${liveName}` });
  await expect(parentLiveLink).toHaveAttribute(
    "href",
    `${liveHref}?performance=${performanceId}`
  );
  await parentLiveLink.click();
  await expect(page).toHaveURL(new RegExp(`\\?performance=${performanceId}$`));
  await expect(page.getByRole("heading", { name: "この公演" })).toBeVisible();
});

test("一覧filterからbare detailへ進み、ListBackButtonでfilterを復元する", async ({
  page,
}) => {
  await page.goto("/lives");
  const groupSelect = page.getByLabel("出演グループで絞り込み");
  const options = groupSelect.locator("option");
  const optionCount = await options.count();
  let selectedGroupId: string | null = null;

  for (let index = 1; index < optionCount; index += 1) {
    const value = await options.nth(index).getAttribute("value");
    if (!value) continue;
    await groupSelect.selectOption(value);
    if ((await page.locator('[data-ui="live-card"]').count()) > 0) {
      selectedGroupId = value;
      break;
    }
  }
  expect(selectedGroupId, "ライブを持つgroup filterが必要です").not.toBeNull();
  await expect(page).toHaveURL(new RegExp(`groupId=${selectedGroupId}`));

  const liveCard = page.locator('[data-ui="live-card"]').first();
  await liveCard.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "← ライブ一覧へ戻る" })
  ).toBeVisible();
  await page.getByRole("button", { name: "← ライブ一覧へ戻る" }).click();

  await expect(page).toHaveURL(new RegExp(`\/lives\\?groupId=${selectedGroupId}$`));
  await expect(groupSelect).toHaveValue(selectedGroupId ?? "");
});
