import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
  { width: 320, height: 720 },
] as const;

const WEEKDAY_FULL_NAMES = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

for (const viewport of viewports) {
  test(`${viewport.width}pxでカレンダーがtable semanticsを持つ`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    const columnHeaders = table.getByRole("columnheader");
    await expect(columnHeaders).toHaveCount(7);

    for (const [index, name] of WEEKDAY_FULL_NAMES.entries()) {
      await expect(columnHeaders.nth(index)).toHaveAccessibleName(name);
    }
  });
}

test("todayのセルのみaria-current=dateを持ち、accessible nameに今日の日付を含む", async ({
  page,
}) => {
  await page.goto("/");

  const todayLinks = page.locator('a[aria-current="date"]');
  await expect(todayLinks).toHaveCount(1);

  const now = new Date();
  const expectedFragment = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const accessibleName = await todayLinks.first().getAttribute("aria-label");
  expect(accessibleName ?? "").toContain(expectedFragment);
});

test("選択中の日付はaccessible nameに年月日と「選択中」を含む", async ({
  page,
}) => {
  await page.goto("/?year=2026&month=7&day=5");

  const selectedLink = page.getByRole("link", {
    name: "2026年7月5日、選択中",
    exact: false,
  });
  await expect(selectedLink).toBeVisible();
});

test("イベントdotのコンテナは常にaria-hiddenを持つ", async ({ page }) => {
  await page.goto("/");

  const violatingCount = await page.evaluate(() => {
    const dots = Array.from(document.querySelectorAll("span.h-1.w-1"));
    const containers = new Set(
      dots
        .map((dot) => dot.parentElement)
        .filter((element): element is HTMLElement => element !== null)
    );
    return Array.from(containers).filter(
      (container) => container.getAttribute("aria-hidden") !== "true"
    ).length;
  });

  expect(violatingCount).toBe(0);
});

test("日付linkはroving tabindexを持たず、Enterキーでhrefへ遷移する", async ({
  page,
}) => {
  await page.goto("/");

  const table = page.getByRole("table");
  const dateLinks = table.getByRole("link");
  const count = await dateLinks.count();
  expect(count).toBeGreaterThan(0);

  const tabindexes = await dateLinks.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("tabindex"))
  );
  for (const tabindex of tabindexes) {
    expect(tabindex).toBeNull();
  }

  const targetLink = dateLinks.first();
  const href = await targetLink.getAttribute("href");
  if (href === null) {
    throw new Error("date linkのhrefを取得できませんでした。");
  }

  await targetLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new URL(href, page.url()).toString());
});
