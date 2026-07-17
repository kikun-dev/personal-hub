import { expect, test } from "@playwright/test";
import { APP_TIME_ZONE, getDatePartsInTimeZone } from "@/lib/dateParams";

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

  // アプリのtoday判定と同じAsia/Tokyo契約で期待値を作る（UTC runnerでのずれを防ぐ）
  const { year, month, day } = getDatePartsInTimeZone(new Date(), APP_TIME_ZONE);
  const expectedFragment = `${year}年${month}月${day}日`;
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

  const { dotCount, violatingCount } = await page
    .getByRole("table")
    .evaluate((table) => {
      const dots = Array.from(table.querySelectorAll("span.h-1.w-1"));
      const containers = new Set(
        dots
          .map((dot) => dot.parentElement)
          .filter((element): element is HTMLElement => element !== null)
      );
      return {
        dotCount: dots.length,
        violatingCount: Array.from(containers).filter(
          (container) => container.getAttribute("aria-hidden") !== "true"
        ).length,
      };
    });

  expect(
    dotCount,
    "event dotを持つseed dataが必要です。0件ではaria-hidden契約を検証できません。"
  ).toBeGreaterThan(0);
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
