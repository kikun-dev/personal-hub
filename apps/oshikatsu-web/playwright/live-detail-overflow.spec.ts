import { expect, test, type Locator, type Page } from "@playwright/test";

const fallbackLiveName = /乃木坂46 真夏の全国ツアー2026/;
const fallbackContexts = [
  { label: "direct", query: "" },
  {
    label: "invalid context",
    query: "?date=invalid-date&performance=missing-performance",
  },
] as const;
const viewports = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
] as const;

async function resolveFallbackLiveHref(page: Page): Promise<string> {
  await page.goto("/lives");
  const liveLink = page.getByRole("link", { name: fallbackLiveName }).first();
  await expect(liveLink).toBeVisible();

  const href = await liveLink.getAttribute("href");
  if (href === null) {
    throw new Error("fallback検証用ライブのhrefを取得できませんでした。");
  }

  return href;
}

async function swipeCarouselWithTouch(
  page: Page,
  carousel: Locator
): Promise<void> {
  const box = await carousel.boundingBox();
  if (box === null) {
    throw new Error("carouselの表示領域を取得できませんでした。");
  }

  const client = await page.context().newCDPSession(page);
  const startX = Math.round(box.x + box.width * 0.8);
  const endX = Math.round(box.x + box.width * 0.2);
  const y = Math.round(box.y + Math.min(box.height / 2, 120));

  try {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y }],
    });
    for (let step = 1; step <= 4; step += 1) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: Math.round(startX + ((endX - startX) * step) / 4),
            y,
          },
        ],
      });
    }
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await client.detach();
  }
}

async function focusWithKeyboard(page: Page, target: Locator): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  for (let index = 0; index < 120; index += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(25);
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
  }

  throw new Error("keyboardでcarousel末尾のリンクへ到達できませんでした。");
}

async function expectFallbackScrollOwnership(
  page: Page,
  browserName: string
): Promise<void> {
  const carousel = page.getByTestId("live-performance-carousel");
  await expect(page.getByRole("link", { name: "← ライブ一覧へ戻る" })).toBeVisible();
  await expect(carousel).toBeVisible();

  const initialMetrics = await carousel.evaluate((element) => {
    const root = document.scrollingElement;
    if (root === null) {
      throw new Error("document.scrollingElementがありません。");
    }

    const style = getComputedStyle(element);
    return {
      carouselClientWidth: element.clientWidth,
      carouselScrollWidth: element.scrollWidth,
      contain: style.contain,
      rootClientWidth: root.clientWidth,
      rootScrollWidth: root.scrollWidth,
      scrollSnapType: style.scrollSnapType,
    };
  });

  expect(initialMetrics.rootScrollWidth).toBe(initialMetrics.rootClientWidth);
  expect(initialMetrics.carouselScrollWidth).toBeGreaterThan(
    initialMetrics.carouselClientWidth
  );
  expect(initialMetrics.contain).toContain("paint");
  expect(initialMetrics.scrollSnapType).toBe("x mandatory");

  await page.evaluate(() => {
    window.scrollTo(document.documentElement.scrollWidth, window.scrollY);
  });
  expect(await page.evaluate(() => window.scrollX)).toBe(0);

  await carousel.hover();
  await page.mouse.wheel(600, 0);
  await expect
    .poll(() => carousel.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollX)).toBe(0);

  await test.step("Chromium-only CDP touch validation", async (step) => {
    step.skip(
      browserName !== "chromium",
      "Chromium-only CDP validation: touch gesture uses newCDPSession()."
    );

    await carousel.evaluate((element) => {
      element.scrollLeft = 0;
    });
    const firstSnapScrollLeft = await carousel.evaluate(
      (element) => element.scrollLeft
    );

    await swipeCarouselWithTouch(page, carousel);
    await expect
      .poll(() => carousel.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(firstSnapScrollLeft);
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
  });

  await carousel.evaluate((element) => {
    element.scrollLeft = 0;
  });

  const lastSetlistLink = carousel
    .getByRole("link", { name: "詳細を見る →" })
    .last();
  await focusWithKeyboard(page, lastSetlistLink);
  await expect(lastSetlistLink).toBeFocused();
  await expect
    .poll(() =>
      carousel.evaluate(
        (element) =>
          element.scrollLeft /
          Math.max(element.scrollWidth - element.clientWidth, 1)
      )
    )
    .toBeGreaterThan(0.8);
  expect(await page.evaluate(() => window.scrollX)).toBe(0);

  await expect
    .poll(() =>
      carousel.evaluate((element) => {
        const activeElement = document.activeElement;
        if (!(activeElement instanceof HTMLElement)) {
          return false;
        }

        const carouselRect = element.getBoundingClientRect();
        const focusRect = activeElement.getBoundingClientRect();
        return (
          focusRect.left >= carouselRect.left + 2 &&
          focusRect.right <= carouselRect.right - 2
        );
      })
    )
    .toBe(true);
}

for (const viewport of viewports) {
  test(`${viewport.width}pxでfallbackのscrollをcarousel内へ閉じる`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize(viewport);
    const liveHref = await resolveFallbackLiveHref(page);

    for (const fallbackContext of fallbackContexts) {
      await test.step(fallbackContext.label, async () => {
        await page.goto(`${liveHref}${fallbackContext.query}`);
        await expectFallbackScrollOwnership(page, browserName);
      });
    }
  });
}
