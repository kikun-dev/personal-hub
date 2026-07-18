import { expect, test, type Locator, type Page } from "@playwright/test";

// #364: OSのreduced motion指定に対し、Mobile drawerの移動・PendingLink spinnerの回転・
// NavigationProgressのpulseを止める契約を、motion utilityと`motion-reduce:`variantの
// ペア宣言（Header.tsx / PendingLink.tsx / NavigationProgress.tsx）で固定した回帰検証。
//
// 実装前にTailwindのコンパイル結果を実機（ヘッドレスChromium）で検証した結果、
// `motion-reduce:transition-none`は`transition-property: none`のみを上書きし、
// `transition-duration`自体は`duration-200`由来の"0.2s"のまま変化しないことを確認した
// （Headless UIは`transition-property: none`によりCSSTransitionオブジェクトが1つも
// 生成されないことを検知してclose処理を即時完了させており、"transitionDurationが0s"
// にはならない）。そのため本specではreduced motion側の検証を
// `transitionProperty === "none"`に対して行い、通常側でのみ既存の"0.2s" regressionを
// pinする。animation側（spin/pulse）は`animate-none`が`animation: none`を生成するため、
// computed `animationName`が`"none"`になることをそのまま検証できる。

function dialogPanel(page: Page): Locator {
  return page.locator('[id^="headlessui-dialog-panel-"]');
}

function dialogBackdrop(page: Page): Locator {
  // Backdropはaria-hidden="true"を持つ唯一のdiv（アイコンのaria-hiddenはsvgでtagが異なる）。
  // Headless UIのPortal/FocusTrapが挟むwrapperの深さに依存しないよう子孫セレクタで探す
  return page.getByRole("dialog").locator('div[aria-hidden="true"]');
}

async function delaySameOriginGetRequests(
  page: Page,
  delayMs: number
): Promise<void> {
  const currentOrigin = new URL(page.url()).origin;
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (
      request.method() === "GET" &&
      new URL(request.url()).origin === currentOrigin
    ) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await route.continue();
  });
}

const mobileViewport = { width: 390, height: 844 } as const; // ハンバーガーはmd:hiddenのため必要
const desktopNavViewport = { width: 1440, height: 900 } as const; // Header内のfeedback="global"リンク（デスクトップnav）を表示するため必要

test("mobile drawer（reduce）: 移動を除き即時に開閉し、Escでfocusが戻る", async ({
  page,
}) => {
  await page.setViewportSize(mobileViewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const openButton = page.getByRole("button", { name: "メニューを開く" });
  await openButton.click();

  const panel = dialogPanel(page);
  const backdrop = dialogBackdrop(page);
  await expect(panel).toBeVisible();

  const [panelStyles, backdropTransitionProperty] = await Promise.all([
    panel.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        transitionProperty: style.transitionProperty,
        transform: style.transform,
      };
    }),
    backdrop.evaluate((element) => getComputedStyle(element).transitionProperty),
  ]);

  expect(panelStyles.transitionProperty).toBe("none");
  expect(backdropTransitionProperty).toBe("none");
  // 開いた状態なのでdata-[closed]:translate-x-fullは適用されず、transformは初期値のまま
  expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(panelStyles.transform);

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(openButton).toBeFocused();

  await openButton.click();
  await expect(panel).toBeVisible();
  await page.getByRole("button", { name: "メニューを閉じる" }).click();
  await expect(panel).toBeHidden();
});

test("mobile drawer（通常）: transitionが200msで再生される", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  await page.getByRole("button", { name: "メニューを開く" }).click();

  const panel = dialogPanel(page);
  await expect(panel).toBeVisible();

  const transitionDuration = await panel.evaluate(
    (element) => getComputedStyle(element).transitionDuration
  );
  // duration-200の200ms regression固定
  expect(transitionDuration).toBe("0.2s");
});

test("PendingLink spinner（reduce）: ringが静止し状態表示は維持される", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lives");

  // feedback未指定（既定"inline"）のPendingLink利用箇所: components/lives/LiveCard.tsx
  const liveCard = page.locator('[data-ui="live-card"]').first();
  await expect(liveCard).toBeVisible();

  await delaySameOriginGetRequests(page, 1300);

  try {
    await liveCard.click();

    const spinner = page.getByRole("status", { name: "読み込み中" });
    await expect(spinner).toBeVisible();
    await expect(liveCard).toHaveAttribute("aria-busy", "true");

    const animationName = await spinner.evaluate(
      (element) => getComputedStyle(element).animationName
    );
    expect(animationName).toBe("none");

    await expect(page).toHaveURL(/\/lives\//, { timeout: 15000 });
  } finally {
    await page.unroute("**/*");
  }
});

test("PendingLink spinner（通常）: spin keyframeで回転する", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/lives");

  const liveCard = page.locator('[data-ui="live-card"]').first();
  await expect(liveCard).toBeVisible();

  await delaySameOriginGetRequests(page, 1300);

  try {
    await liveCard.click();

    const spinner = page.getByRole("status", { name: "読み込み中" });
    await expect(spinner).toBeVisible();

    const animationName = await spinner.evaluate(
      (element) => getComputedStyle(element).animationName
    );
    expect(animationName).not.toBe("none");

    await expect(page).toHaveURL(/\/lives\//, { timeout: 15000 });
  } finally {
    await page.unroute("**/*");
  }
});

test("NavigationProgress（reduce）: barが静止し全幅になる", async ({ page }) => {
  await page.setViewportSize(desktopNavViewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await delaySameOriginGetRequests(page, 1300);

  try {
    // Header内、feedback="global"のPendingLink（デスクトップnav）
    const navLink = page
      .locator("header nav")
      .first()
      .getByRole("link", { name: "メンバー", exact: true });
    await navLink.click();

    const progressBar = page.getByRole("status", { name: "画面遷移中" });
    await expect(progressBar).toBeVisible();
    const innerBar = progressBar.locator("div").first();

    const [animationName, outerWidth, innerWidth] = await Promise.all([
      innerBar.evaluate((element) => getComputedStyle(element).animationName),
      progressBar.evaluate((element) => element.getBoundingClientRect().width),
      innerBar.evaluate((element) => element.getBoundingClientRect().width),
    ]);

    expect(animationName).toBe("none");
    // 1/3幅のまま静止すると停滞した進捗に誤読されるため、reduce時は全幅で静止する
    expect(innerWidth).toBeCloseTo(outerWidth, 0);

    await expect(page).toHaveURL(/\/members/, { timeout: 15000 });
  } finally {
    await page.unroute("**/*");
  }
});

test("NavigationProgress（通常）: pulse keyframeで1/3幅のバーが再生される", async ({
  page,
}) => {
  await page.setViewportSize(desktopNavViewport);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");

  await delaySameOriginGetRequests(page, 1300);

  try {
    const navLink = page
      .locator("header nav")
      .first()
      .getByRole("link", { name: "メンバー", exact: true });
    await navLink.click();

    const progressBar = page.getByRole("status", { name: "画面遷移中" });
    await expect(progressBar).toBeVisible();
    const innerBar = progressBar.locator("div").first();

    const [animationName, outerWidth, innerWidth] = await Promise.all([
      innerBar.evaluate((element) => getComputedStyle(element).animationName),
      progressBar.evaluate((element) => element.getBoundingClientRect().width),
      innerBar.evaluate((element) => element.getBoundingClientRect().width),
    ]);

    expect(animationName).not.toBe("none");
    expect(innerWidth).toBeLessThan(outerWidth * 0.5);

    await expect(page).toHaveURL(/\/members/, { timeout: 15000 });
  } finally {
    await page.unroute("**/*");
  }
});
