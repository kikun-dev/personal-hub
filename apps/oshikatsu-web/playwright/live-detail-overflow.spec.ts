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

  // trackpad/mouse wheel は mobile WebKit で未サポート（page.mouse.wheel が throw する）。
  // mobileの水平scrollは後段のCDP touch stepが担うため、wheel検証はChromiumに限定する。
  await test.step("Chromium-only wheel validation", async (step) => {
    step.skip(
      browserName !== "chromium",
      "Chromium-only: page.mouse.wheel is unsupported in mobile WebKit."
    );

    await carousel.hover();
    await page.mouse.wheel(600, 0);
    await expect
      .poll(() => carousel.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
  });

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

  // #377: keyboard操作（ArrowRight）で active-card model が inner carousel を scroll する。
  // root（window）は動かず inner だけが右へ進むこと（containment）を確認する。
  await carousel.evaluate((element) => {
    element.scrollLeft = 0;
  });
  const nextButton = page.getByRole("button", { name: "次の公演" });
  await expect(nextButton).toBeVisible();
  await nextButton.focus();
  await expect(nextButton).toBeFocused();

  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(80);
    // 各押下の時点で root（window）は決して横スクロールしない
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
  }
  // 反復した ArrowRight の結果、inner carousel は先頭（0）から右へ進んでいる
  await expect
    .poll(() => carousel.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
}

for (const viewport of viewports) {
  test(`${viewport.width}pxでfallbackのscrollをcarousel内へ閉じる`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize(viewport);
    // #377: keyboardナビ（Arrow）の programmatic scroll を instant にして、smooth animation の
    // 着地タイミング依存（並列実行時の負荷でフレーキーになる）を除く。containment/snap/touch の
    // 検証内容は reduced-motion で変わらない（同じ scroll 位置・同じ snap 挙動）。
    await page.emulateMedia({ reducedMotion: "reduce" });
    const liveHref = await resolveFallbackLiveHref(page);

    for (const fallbackContext of fallbackContexts) {
      await test.step(fallbackContext.label, async () => {
        await page.goto(`${liveHref}${fallbackContext.query}`);
        await expectFallbackScrollOwnership(page, browserName);
      });
    }
  });
}
