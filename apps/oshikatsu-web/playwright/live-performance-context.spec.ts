import { expect, test, type Locator, type Page } from "@playwright/test";
import { focusWithKeyboard } from "./contrast";
import { installTrackedRoute } from "./trackedRoute";

const TARGET_LIVE_NAME = /乃木坂46 真夏の全国ツアー2026/;
const TARGET_GROUP_NAME = "乃木坂46";
const NONEXISTENT_PERFORMANCE_ID = "77777777-7777-4777-8777-777777777777";
const TOP_SETLIST_DATE = "2026-06-13";

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

function pathAndSearch(page: Page): string {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
}

async function expectPath(page: Page, expected: string): Promise<void> {
  await expect.poll(() => pathAndSearch(page)).toBe(expected);
}

type FilteredLiveEntry = {
  filteredListHref: string;
  liveHref: string;
  selectedGroupId: string;
};

async function enterTargetLiveFromFilteredList(
  page: Page
): Promise<FilteredLiveEntry> {
  await page.goto("/lives");
  const groupSelect = page.getByLabel("出演グループで絞り込み");
  const targetOption = groupSelect
    .locator("option")
    .filter({ hasText: new RegExp(`^${TARGET_GROUP_NAME}$`) });
  const selectedGroupId = await targetOption.getAttribute("value");
  if (!selectedGroupId) {
    throw new Error("対象Liveのgroup filter valueを取得できませんでした。");
  }
  await groupSelect.selectOption(selectedGroupId);
  await expect(groupSelect).toHaveValue(selectedGroupId);
  const filteredListHref = `/lives?groupId=${encodeURIComponent(selectedGroupId)}`;
  await expectPath(page, filteredListHref);

  const liveLink = page.getByRole("link", { name: TARGET_LIVE_NAME }).first();
  await expect(liveLink).toBeVisible();
  const liveHref = await liveLink.getAttribute("href");
  if (liveHref === null) {
    throw new Error("filter済み一覧から対象Liveのhrefを取得できませんでした。");
  }
  await liveLink.focus();
  await page.keyboard.press("Enter");
  await expectPath(page, liveHref);
  await expect(
    page.getByRole("button", { name: "← ライブ一覧へ戻る" })
  ).toBeVisible();

  return { filteredListHref, liveHref, selectedGroupId };
}

async function expectFilteredListRestored(
  page: Page,
  entry: FilteredLiveEntry
): Promise<void> {
  await expectPath(page, entry.filteredListHref);
  await expect(page.getByLabel("出演グループで絞り込み")).toHaveValue(
    entry.selectedGroupId
  );
}

async function performanceWithSetlist(
  page: Page,
  liveHref: string
): Promise<{
  expected: PerformanceExpectation;
  setlistHref: string;
}> {
  const carouselGroups = page
    .getByTestId("live-performance-carousel")
    .getByRole("group");
  const groupCount = await carouselGroups.count();

  for (let index = 0; index < groupCount; index += 1) {
    const group = carouselGroups.nth(index);
    if ((await group.locator("ol").count()) === 0) continue;
    const setlistHref = await group
      .getByRole("link", { name: "詳細を見る →" })
      .getAttribute("href");
    const performanceId =
      setlistHref?.match(/\/performances\/([0-9a-f-]{36})\/setlist$/i)?.[1] ??
      null;
    if (setlistHref === null || performanceId === null) continue;

    const scheduleLink = page
      .locator(`main a[href="${liveHref}?performance=${performanceId}"]`)
      .first();
    return {
      expected: await readPerformanceExpectation(scheduleLink),
      setlistHref,
    };
  }

  throw new Error("セットリストを持つ公演が必要です。");
}

async function returnToBareLive(page: Page, liveHref: string): Promise<void> {
  const backLink = page.getByRole("link", { name: "← ライブ全体へ戻る" });
  await expect(backLink).toHaveAttribute("href", liveHref);
  await backLink.click();
  await expectPath(page, liveHref);
  await expect(page.getByTestId("live-performance-carousel")).toBeVisible();
}

async function returnToFilteredList(
  page: Page,
  entry: FilteredLiveEntry
): Promise<void> {
  await page.getByRole("button", { name: "← ライブ一覧へ戻る" }).click();
  await expectFilteredListRestored(page, entry);
}

type TopEntry = {
  date: string;
  expected: PerformanceExpectation;
  liveHref: string;
  sourceHref: string;
  topHref: string;
};

async function enterTopSetlistPerformance(page: Page): Promise<TopEntry> {
  const sourceHref = "/?year=2026&month=6&day=13";
  await page.goto(sourceHref);
  const topLink = page
    .locator(
      `main a[href^="/lives/"][href*="date=${TOP_SETLIST_DATE}"][href*="&performance="]`
    )
    .filter({ hasText: TARGET_LIVE_NAME })
    .first();
  await expect(topLink).toBeVisible();
  const topHref = await topLink.getAttribute("href");
  if (topHref === null) {
    throw new Error("TopのSetlist fixture公演へのhrefを取得できませんでした。");
  }
  const topUrl = new URL(topHref, page.url());
  const performanceId = topUrl.searchParams.get("performance");
  if (performanceId === null) {
    throw new Error("Top導線にperformance IDがありません。");
  }
  const liveHref = topUrl.pathname;

  await page.goto(liveHref);
  const expected = await readPerformanceExpectation(
    page.locator(`main a[href="${liveHref}?performance=${performanceId}"]`).first()
  );
  await page.goto(sourceHref);
  await page.locator(`main a[href="${topHref}"]`).first().click();
  await expectPath(page, topHref);
  await expectPrimaryMatches(page, expected);

  return {
    date: TOP_SETLIST_DATE,
    expected,
    liveHref,
    sourceHref,
    topHref,
  };
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
});

test("Journey 7: direct P → D はperformance entryをbare Liveへ置換する", async ({
  page,
}) => {
  const liveHref = await resolveTargetLiveHref(page);
  await page.goto(liveHref);
  const expected = await readPerformanceExpectation(
    performanceLinks(page, liveHref).nth(1)
  );

  await test.step("direct visit", async () => {
    await page.goto(expected.href);
    await expectPrimaryMatches(page, expected);
  });
  await page.getByRole("link", { name: "← ライブ全体へ戻る" }).click();
  await expectPath(page, liveHref);
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

test("Journey 8: P_A編集中 → P_B はperformance固有stateを引き継がない", async ({
  page,
}) => {
  const liveHref = await resolveTargetLiveHref(page);
  await page.goto(liveHref);
  const editingTarget = await readPerformanceExpectation(
    performanceLinks(page, liveHref).nth(1)
  );
  const nextTarget = await readPerformanceExpectation(
    performanceLinks(page, liveHref).nth(2)
  );
  expect(nextTarget.performanceId).not.toBe(editingTarget.performanceId);

  await page.goto(editingTarget.href);
  await expectPrimaryMatches(page, editingTarget);
  const currentSection = page.locator("section", {
    has: page.getByRole("heading", { level: 2, name: "この公演" }),
  });
  await currentSection
    .getByRole("button", { name: /^(参戦を記録|編集)$/ })
    .click();
  const unsavedNote = "切り替え前の未保存入力";
  const noteField = currentSection.getByLabel("メモ", { exact: true });
  await noteField.fill(unsavedNote);
  await expect(noteField).toHaveValue(unsavedNote);

  await page.locator(`main a[href="${nextTarget.href}"]`).click();
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}${url.search}`;
    })
    .toBe(nextTarget.href);
  await expectPrimaryMatches(page, nextTarget);
  expect(
    await page.locator("textarea").evaluateAll(
      (textareas, value) =>
        textareas.some(
          (textarea) => (textarea as HTMLTextAreaElement).value === value
        ),
      unsavedNote
    )
  ).toBe(false);
});

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

test("Journey 1: F → D → F はURLとfilter controlを復元する", async ({
  page,
}) => {
  const entry = await enterTargetLiveFromFilteredList(page);
  await returnToFilteredList(page, entry);
});

test("Journey 2: F → D → P → D → F を1つのfamily slotで往復する", async ({
  page,
}) => {
  const entry = await enterTargetLiveFromFilteredList(page);
  const selected = await readPerformanceExpectation(
    performanceLinks(page, entry.liveHref).nth(1)
  );

  await page.locator(`main a[href="${selected.href}"]`).first().click();
  await expectPath(page, selected.href);
  await expectPrimaryMatches(page, selected);
  await returnToBareLive(page, entry.liveHref);
  await returnToFilteredList(page, entry);
});

test("Journey 3: F → D → P → S → P → D → F とSetlist browser backを固定する", async ({
  page,
}) => {
  let entry = await enterTargetLiveFromFilteredList(page);
  let setlist = await performanceWithSetlist(page, entry.liveHref);

  await page.locator(`main a[href="${setlist.expected.href}"]`).first().click();
  await expectPath(page, setlist.expected.href);
  await expectPrimaryMatches(page, setlist.expected);
  let liveName = (await page.getByRole("heading", { level: 1 }).textContent())?.trim();
  if (!liveName) throw new Error("Setlistの親Live名を取得できませんでした。");
  const primary = page.locator("section", {
    has: page.getByRole("heading", { level: 2, name: "この公演" }),
  });
  await primary.getByRole("link", { name: "詳細を見る →" }).click();
  await expectPath(page, setlist.setlistHref);

  await page.goBack();
  await expectFilteredListRestored(page, entry);

  entry = await enterTargetLiveFromFilteredList(page);
  setlist = await performanceWithSetlist(page, entry.liveHref);
  await page.locator(`main a[href="${setlist.expected.href}"]`).first().click();
  await expectPath(page, setlist.expected.href);
  liveName = (await page.getByRole("heading", { level: 1 }).textContent())?.trim();
  if (!liveName) throw new Error("Setlistの親Live名を取得できませんでした。");
  await page
    .locator("section", {
      has: page.getByRole("heading", { level: 2, name: "この公演" }),
    })
    .getByRole("link", { name: "詳細を見る →" })
    .click();
  await expectPath(page, setlist.setlistHref);

  const parentLiveLink = page.getByRole("link", { name: `← ${liveName}` });
  await expect(parentLiveLink).toHaveAttribute("href", setlist.expected.href);
  await parentLiveLink.click();
  await expectPath(page, setlist.expected.href);
  await expectPrimaryMatches(page, setlist.expected);
  await returnToBareLive(page, entry.liveHref);
  await returnToFilteredList(page, entry);
});

test("Journey 4: F → D → S → P → D → F を1つのfamily slotで往復する", async ({
  page,
}) => {
  const entry = await enterTargetLiveFromFilteredList(page);
  const setlist = await performanceWithSetlist(page, entry.liveHref);
  const liveName = (await page.getByRole("heading", { level: 1 }).textContent())?.trim();
  if (!liveName) throw new Error("Setlistの親Live名を取得できませんでした。");
  const carouselSetlistLink = page
    .getByTestId("live-performance-carousel")
    .locator(`a[href="${setlist.setlistHref}"]`);
  await expect(carouselSetlistLink).toHaveCount(1);
  await carouselSetlistLink.click();
  await expectPath(page, setlist.setlistHref);

  const parentLiveLink = page.getByRole("link", { name: `← ${liveName}` });
  await expect(parentLiveLink).toHaveAttribute("href", setlist.expected.href);
  await parentLiveLink.click();
  await expectPath(page, setlist.expected.href);
  await expectPrimaryMatches(page, setlist.expected);
  await returnToBareLive(page, entry.liveHref);
  await returnToFilteredList(page, entry);
});

test("Journey 5: Top/date → T → Top/date はdate・performance・primaryを維持する", async ({
  page,
}) => {
  const entry = await enterTopSetlistPerformance(page);
  const [, month, day] = entry.date.split("-").map(Number);
  const topBackLink = page.getByRole("link", {
    name: `← ${month}/${day}の出来事へ戻る`,
  });
  await expect(topBackLink).toHaveAttribute("href", entry.sourceHref);
  expect(new URL(page.url()).searchParams.get("date")).toBe(entry.date);
  expect(new URL(page.url()).searchParams.get("performance")).toBe(
    entry.expected.performanceId
  );
  await topBackLink.click();
  await expectPath(page, entry.sourceHref);
  await expectNoHorizontalOverflow(page);
});

test("Journey 6: Top/date → T → S → 親Live → Top/date とSetlist browser backを固定する", async ({
  page,
}) => {
  let entry = await enterTopSetlistPerformance(page);
  let primary = page.locator("section", {
    has: page.getByRole("heading", { level: 2, name: "この公演" }),
  });
  let liveName = (await page.getByRole("heading", { level: 1 }).textContent())?.trim();
  if (!liveName) throw new Error("Setlistの親Live名を取得できませんでした。");
  let setlistLink = primary.getByRole("link", { name: "詳細を見る →" });
  const expectedSetlistHref = `${entry.liveHref}/performances/${entry.expected.performanceId}/setlist?date=${entry.date}`;
  await expect(setlistLink).toHaveAttribute("href", expectedSetlistHref);
  await setlistLink.click();
  await expectPath(page, expectedSetlistHref);

  await page.goBack();
  await expectPath(page, entry.sourceHref);

  entry = await enterTopSetlistPerformance(page);
  liveName = (await page.getByRole("heading", { level: 1 }).textContent())?.trim();
  if (!liveName) throw new Error("Setlistの親Live名を取得できませんでした。");
  primary = page.locator("section", {
    has: page.getByRole("heading", { level: 2, name: "この公演" }),
  });
  setlistLink = primary.getByRole("link", { name: "詳細を見る →" });
  await setlistLink.click();
  await expectPath(page, expectedSetlistHref);

  const parentLiveLink = page.getByRole("link", { name: `← ${liveName}` });
  await expect(parentLiveLink).toHaveAttribute("href", entry.topHref);
  await parentLiveLink.click();
  await expectPath(page, entry.topHref);
  await expectPrimaryMatches(page, entry.expected);

  const [, month, day] = entry.date.split("-").map(Number);
  await page
    .getByRole("link", { name: `← ${month}/${day}の出来事へ戻る` })
    .click();
  await expectPath(page, entry.sourceHref);
});
