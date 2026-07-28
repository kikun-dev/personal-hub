import { expect, test } from "@playwright/test";
import { getTodayInAppTimeZone } from "@/lib/dateParams";
import {
  BIRTHDAY_COLOR,
  LIVE_COLOR,
  RELEASE_COLOR,
  VIDEO_COLOR,
} from "@/lib/constants";
import { parseColor } from "./contrast";

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

  // アプリのtoday判定（getTodayInAppTimeZone / Asia/Tokyo契約）と同じ関数で期待値を作る。
  // #412: この関数は E2E_FIXED_TODAY を尊重するため、server が描画する固定「今日」と一致する。
  const today = getTodayInAppTimeZone();
  const expectedFragment = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
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

// 凡例（#402）: dot色は実イベント色定数と1:1一致し、種別はテキストラベルで伝える。
const LEGEND_EXPECTATIONS = [
  { label: "ライブ", color: LIVE_COLOR },
  { label: "リリース", color: RELEASE_COLOR },
  { label: "動画", color: VIDEO_COLOR },
  { label: "誕生日", color: BIRTHDAY_COLOR },
] as const;

function toRgbTriplet(value: string): { r: number; g: number; b: number } {
  const { r, g, b } = parseColor(value);
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

for (const viewport of viewports) {
  test(`${viewport.width}pxで凡例が1組だけ表示され、dot色が実イベント色定数と一致する`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    // desktop=surface内右列 / mobile=カレンダー下部。両方がDOMに存在するが、
    // viewportごとに片方のみ可視（hidden lg:block / lg:hidden）である。
    const calendarSection = page.locator("section", {
      has: page.locator("#calendar"),
    });
    const legend = calendarSection.locator("ul:visible");
    await expect(legend).toHaveCount(1);

    const items = legend.getByRole("listitem");
    await expect(items).toHaveCount(LEGEND_EXPECTATIONS.length);

    for (const [index, expected] of LEGEND_EXPECTATIONS.entries()) {
      const item = items.nth(index);
      await expect(item).toHaveText(expected.label);
      const dotColor = await item
        .locator('span[aria-hidden="true"]')
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(toRgbTriplet(dotColor)).toEqual(toRgbTriplet(expected.color));
    }
  });
}

// 曜日ヘッダの色（#402）: 日曜=danger / 土曜=info のtheme別semantic tokenを固定する。
const weekendHeaderColors = {
  light: { sunday: "#B42318", saturday: "#3557B7" },
  dark: { sunday: "#FFB4AB", saturday: "#93C5FD" },
} as const;

for (const theme of ["light", "dark"] as const) {
  test(`${theme}で日曜headerがdanger / 土曜headerがinfoのsemantic token色を持つ`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");

    const headers = page.getByRole("columnheader");
    const sundayColor = await headers
      .nth(0)
      .evaluate((element) => getComputedStyle(element).color);
    const saturdayColor = await headers
      .nth(6)
      .evaluate((element) => getComputedStyle(element).color);

    expect(toRgbTriplet(sundayColor)).toEqual(
      toRgbTriplet(weekendHeaderColors[theme].sunday)
    );
    expect(toRgbTriplet(saturdayColor)).toEqual(
      toRgbTriplet(weekendHeaderColors[theme].saturday)
    );
  });
}
