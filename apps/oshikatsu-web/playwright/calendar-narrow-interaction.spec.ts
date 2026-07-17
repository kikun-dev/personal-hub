import { expect, test } from "@playwright/test";

const narrowViewports = [
  { width: 320, height: 720, minHitAreaPx: 40 },
  { width: 390, height: 844, minHitAreaPx: 44 },
] as const;

for (const viewport of narrowViewports) {
  test(`${viewport.width}pxで/がdocument幅をoverflowしない`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBe(clientWidth);
  });

  test(`${viewport.width}pxでToday/前月/翌月/date linkのhit areaが${viewport.minHitAreaPx}px以上`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const todayButton = page.getByRole("button", { name: "Today" });
    const prevButton = page.getByRole("button", { name: "← 前月" });
    const nextButton = page.getByRole("button", { name: "翌月 →" });
    const dateLink = page.getByRole("table").getByRole("link").first();

    for (const control of [todayButton, prevButton, nextButton, dateLink]) {
      const box = await control.boundingBox();
      if (box === null) {
        throw new Error("controlのboundingBoxを取得できませんでした。");
      }
      expect(box.height).toBeGreaterThanOrEqual(viewport.minHitAreaPx);
    }
  });
}

test("mobile projectでハンバーガーボタンが44×44px以上のhit areaを持つ", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "mobile",
    "ハンバーガーはmd:hiddenでmobile viewportのみ表示される"
  );

  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "メニューを開く" });
  const box = await menuButton.boundingBox();
  if (box === null) {
    throw new Error("ハンバーガーボタンのboundingBoxを取得できませんでした。");
  }
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test("翌月クリック後、翌月ボタンへfocusが残り新しい月がstatusで通知される", async ({
  page,
}) => {
  await page.goto("/");

  const nextButton = page.getByRole("button", { name: "翌月 →" });
  const monthLabel = page.getByText(/^\d{4}年\d{1,2}月$/).first();
  const status = page.getByRole("status");

  const monthBefore = await monthLabel.textContent();
  await expect(status).toHaveText("");

  await nextButton.click();

  await expect(nextButton).toBeFocused();
  // router.push後のserver再描画を待つため、auto-retryするassertionでlabel更新を確認する
  if (monthBefore === null) {
    throw new Error("月labelを取得できませんでした。");
  }
  await expect(monthLabel).not.toHaveText(monthBefore);
  const monthAfter = await monthLabel.textContent();
  await expect(status).toHaveText(new RegExp(`^${monthAfter}、\\d+日を選択中$`));
});

test("date選択後、見出しへfocusが移り、カレンダーへ戻るリンクで#calendarへ戻れる", async ({
  page,
}) => {
  await page.goto("/");

  // aria-current="date"を持つのはtodayのみ（#361契約）。今日以外の日付を選んで
  // 「選んだ日のSakalog」分岐（戻り導線を持つ側）へ確実に遷移させる。
  const targetLink = page
    .getByRole("table")
    .locator('a:not([aria-current="date"])')
    .first();
  const href = await targetLink.getAttribute("href");
  if (href === null) {
    throw new Error("date linkのhrefを取得できませんでした。");
  }

  await targetLink.click();
  await expect(page).toHaveURL(new URL(href, page.url()).toString());

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeFocused();

  const backToCalendarLink = page.getByRole("link", {
    name: "↓ カレンダーへ戻る",
  });
  await expect(backToCalendarLink).toBeVisible();

  await backToCalendarLink.click();
  await expect(page.locator("#calendar")).toBeInViewport();
});
