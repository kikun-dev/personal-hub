import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  composite,
  expectContrastAtLeast,
  parseColor,
  themes,
} from "./contrast";

const interactionViewports = [
  { width: 320, height: 720, minHitAreaPx: 40 },
  { width: 390, height: 844, minHitAreaPx: 44 },
  { width: 1440, height: 1000, minHitAreaPx: 44 },
] as const;

type FocusStyles = {
  outlineColor: string;
  outlineStyle: string;
  outlineWidth: string;
  backgroundColor: string;
};

async function readFocusStyles(target: Locator): Promise<FocusStyles> {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      backgroundColor: style.backgroundColor,
    };
  });
}

async function expectSemanticFocusRing(
  page: Page,
  target: Locator,
  label: string
): Promise<void> {
  await expect(target).toBeFocused();
  const styles = await readFocusStyles(target);
  expect(styles.outlineStyle, `${label}のoutlineStyleがnoneです`).not.toBe("none");
  expect(styles.outlineWidth, `${label}のoutlineWidthが2pxではありません`).toBe(
    "2px"
  );

  const bodyBackground = await page
    .locator("body")
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  const adjacentBackground = composite(
    parseColor(styles.backgroundColor),
    parseColor(bodyBackground)
  );
  expectContrastAtLeast(
    parseColor(styles.outlineColor),
    adjacentBackground,
    3,
    `${label} focus indicator`
  );
}

async function expectNoKeyboardFocusRing(
  target: Locator,
  label: string
): Promise<void> {
  await expect(target).toBeFocused();
  const styles = await readFocusStyles(target);
  const hasVisibleOutline =
    styles.outlineStyle !== "none" && Number.parseFloat(styles.outlineWidth) > 0;
  expect(
    hasVisibleOutline,
    `${label}でtouch起点にもkeyboard用outlineが表示されています`
  ).toBe(false);
}

for (const viewport of interactionViewports) {
  test(`${viewport.width}pxで/がdocument幅をoverflowしない`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBe(clientWidth);
  });

  test(`${viewport.width}pxで今日/前月/翌月/date linkのhit areaが${viewport.minHitAreaPx}px以上`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const todayButton = page.getByRole("button", { name: "今日" });
    const prevButton = page.getByRole("button", { name: "← 前月" });
    const nextButton = page.getByRole("button", { name: "翌月 →" });
    const dateLink = page.getByRole("table").getByRole("link").first();

    for (const control of [todayButton, prevButton, nextButton]) {
      const box = await control.boundingBox();
      if (box === null) {
        throw new Error("controlのboundingBoxを取得できませんでした。");
      }
      expect(box.height).toBeGreaterThanOrEqual(viewport.minHitAreaPx);
    }

    // date linkは縦横両方のhit areaをassertし、24pxのvisual circleが
    // hit area拡大の影響を受けていないことも別途確認する（#362 P2）
    const dateLinkBox = await dateLink.boundingBox();
    if (dateLinkBox === null) {
      throw new Error("date linkのboundingBoxを取得できませんでした。");
    }
    expect(dateLinkBox.width).toBeGreaterThanOrEqual(viewport.minHitAreaPx);
    expect(dateLinkBox.height).toBeGreaterThanOrEqual(viewport.minHitAreaPx);

    const circleBox = await dateLink.locator("span").first().boundingBox();
    if (circleBox === null) {
      throw new Error("visual circleのboundingBoxを取得できませんでした。");
    }
    expect(circleBox.width).toBe(24);
    expect(circleBox.height).toBe(24);
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

  // drawer内の「メニューを閉じる」も同じhit areaを持つ（#362 P2）
  await menuButton.click();
  const closeButton = page.getByRole("button", { name: "メニューを閉じる" });
  await expect(closeButton).toBeVisible();
  const closeBox = await closeButton.boundingBox();
  if (closeBox === null) {
    throw new Error("閉じるボタンのboundingBoxを取得できませんでした。");
  }
  expect(closeBox.width).toBeGreaterThanOrEqual(44);
  expect(closeBox.height).toBeGreaterThanOrEqual(44);
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

const boundaryCases = [
  {
    label: "上限",
    startUrl: "/?year=2100&month=11&day=30",
    boundaryUrl: /year=2100&month=12&day=30/,
    buttonName: "翌月 →",
    previousTargetName: "← 前月",
    nextTarget: "date" as const,
  },
  {
    label: "下限",
    startUrl: "/?year=2000&month=2&day=29",
    boundaryUrl: /year=2000&month=1&day=29/,
    buttonName: "← 前月",
    previousTargetName: "今日",
    nextTarget: "翌月 →" as const,
  },
] as const;

for (const boundary of boundaryCases) {
  test(`月範囲${boundary.label}でも押下buttonへfocusを維持しaria-disabled操作はno-op`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(boundary.startUrl);

    const boundaryButton = page.getByRole("button", {
      name: boundary.buttonName,
    });
    await boundaryButton.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(boundary.boundaryUrl);

    await expect(boundaryButton).toBeFocused();
    await expect(boundaryButton).toHaveAttribute("aria-disabled", "true");
    await expect(boundaryButton).not.toHaveAttribute("disabled", "");

    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: boundary.previousTargetName })
    ).toBeFocused();

    await boundaryButton.focus();
    await page.keyboard.press("Tab");
    if (boundary.nextTarget === "date") {
      await expect(page.getByRole("table").getByRole("link").first()).toBeFocused();
    } else {
      await expect(
        page.getByRole("button", { name: boundary.nextTarget })
      ).toBeFocused();
    }

    await boundaryButton.focus();
    const boundaryUrl = page.url();
    const status = page.getByRole("status");
    const announcement = await status.textContent();

    for (const action of ["click", "Enter", "Space"] as const) {
      if (action === "click") {
        // Playwrightはaria-disabledを操作不能と解釈して通常clickを待機するため、
        // browserへpointer clickをdispatchしてhandlerの境界no-opを直接検証する。
        await boundaryButton.click({ force: true });
      } else {
        await boundaryButton.press(action);
      }
      await expect(boundaryButton).toBeFocused();
      expect(page.url()).toBe(boundaryUrl);
      await expect(status).toHaveText(announcement ?? "");
    }
  });
}

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

  await targetLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new URL(href, page.url()).toString());

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeFocused();

  const backToCalendarLink = page.getByRole("link", {
    name: "↓ カレンダーへ戻る",
  });
  await expect(backToCalendarLink).toBeVisible();

  // 戻り操作はviewport内表示だけでなく、focus destinationと次のTab順まで検証する（#362 P1）
  await backToCalendarLink.focus();
  await page.keyboard.press("Enter");
  const calendarHeading = page.locator("#calendar");
  await expect(calendarHeading).toBeInViewport();
  await expect(calendarHeading).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "今日" })).toBeFocused();
});

for (const theme of themes) {
  for (const viewport of interactionViewports) {
    test(`programmatic heading focusがsemantic ringを持つ（${theme} ${viewport.width}px）`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/");

      const targetLink = page
        .getByRole("table")
        .locator('a:not([aria-current="date"])')
        .first();
      await targetLink.focus();
      await page.keyboard.press("Enter");

      const resultHeading = page.getByRole("heading", { level: 1 });
      await expectSemanticFocusRing(
        page,
        resultHeading,
        `${theme} ${viewport.width}px Daily Story H1`
      );

      const returnLink = page.getByRole("link", {
        name: "↓ カレンダーへ戻る",
      });
      await returnLink.focus();
      await page.keyboard.press("Enter");

      const calendarHeading = page.locator("#calendar");
      await expectSemanticFocusRing(
        page,
        calendarHeading,
        `${theme} ${viewport.width}px Calendar H2`
      );
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "今日" })).toBeFocused();
    });
  }

  test(`touch起点のprogrammatic heading focusへkeyboard用ringを表示しない（${theme}）`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");

    const targetLink = page
      .getByRole("table")
      .locator('a:not([aria-current="date"])')
      .first();
    await targetLink.click();

    const resultHeading = page.getByRole("heading", { level: 1 });
    await expectNoKeyboardFocusRing(resultHeading, `${theme} Daily Story H1`);

    await page.getByRole("link", { name: "↓ カレンダーへ戻る" }).click();
    await expectNoKeyboardFocusRing(page.locator("#calendar"), `${theme} Calendar H2`);
  });
}
