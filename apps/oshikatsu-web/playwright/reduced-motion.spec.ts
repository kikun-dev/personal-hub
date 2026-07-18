import { expect, test, type Locator, type Page } from "@playwright/test";

// #364/#378: OSのreduced motion指定に対し、Mobile drawerの移動・PendingLink spinnerの回転・
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
//
// #378 P1対応: 静止したring/barだけでは「pending状態」を読み取れない（欠けた円や
// 装飾的border/完了済みprogressと誤読される）ため、reduce時はring/barをhidden化し、
// 代わりに可視の小さなテキストpill（PendingLink: `{pendingLabel}…` / NavigationProgress:
// 「画面を読み込み中…」）を表示する設計に変更した。読み上げは親要素のaria-label /
// role="status"が担うため、可視pillはaria-hiddenにして二重読み上げを防いでいる。
// そのためreduce側spinnerテストのanimationName検証はring要素では実施不能（hidden要素は
// 非表示検証のみ行い、代わりに可視ラベルの表示・非overflowを検証する）。

function dialogPanel(page: Page): Locator {
  return page.locator('[id^="headlessui-dialog-panel-"]');
}

function dialogBackdrop(page: Page): Locator {
  // Backdropはaria-hidden="true"を持つ唯一のdiv（アイコンのaria-hiddenはsvgでtagが異なる）。
  // Headless UIのPortal/FocusTrapが挟むwrapperの深さに依存しないよう子孫セレクタで探す
  return page.getByRole("dialog").locator('div[aria-hidden="true"]');
}

async function assertFocusWithinPanel(page: Page): Promise<void> {
  // Headless UIのFocusTrapはdialog panel内でTab循環するため、activeElementが
  // panel配下に留まり続けることをDOM APIベースで検証する（要素の具体的な種類に依存しない）
  const isWithinPanel = await page.evaluate(() => {
    return (
      document.activeElement?.closest('[id^="headlessui-dialog-panel-"]') !==
      null
    );
  });
  expect(isWithinPanel).toBe(true);
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

// 320px（最小サポート幅）/ 390pxの両方でdrawerの契約（移動停止・focus trap・scroll lock）が
// 崩れないことを明示的にparameterizeして検証する（#378 P2）
const drawerReduceViewports = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
] as const;

for (const viewport of drawerReduceViewports) {
  test(`mobile drawer（reduce, ${viewport.width}px）: 移動を除き即時に開閉し、Escでfocusが戻る。focus trap/scroll lockも維持される`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
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
      backdrop.evaluate(
        (element) => getComputedStyle(element).transitionProperty
      ),
    ]);

    expect(panelStyles.transitionProperty).toBe("none");
    expect(backdropTransitionProperty).toBe("none");
    // 開いた状態なのでdata-[closed]:translate-x-fullは適用されず、transformは初期値のまま
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(
      panelStyles.transform
    );

    // focus trap: open中はTab/Shift+Tabで移動してもfocusがpanel外へ出ない
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press("Tab");
      await assertFocusWithinPanel(page);
    }
    for (let i = 0; i < 2; i += 1) {
      await page.keyboard.press("Shift+Tab");
      await assertFocusWithinPanel(page);
    }

    // focus trapの境界循環（#378 P2）: 数回のTabでは末尾/先頭境界へ到達せず、trapを
    // 外しても通ってしまう。末尾要素からTabで先頭へ、先頭からShift+Tabで末尾へ
    // 循環することを、panel内tabbable一覧のindexで直接assertする
    const panelTabbableIndex = (p: Page) =>
      p.evaluate(() => {
        const panel = document.querySelector('[id^="headlessui-dialog-panel-"]');
        if (panel === null) return { index: -1, count: 0 };
        const tabbables = Array.from(
          panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
        );
        return {
          index: tabbables.indexOf(document.activeElement as HTMLElement),
          count: tabbables.length,
        };
      });

    const tabbableCount = await page.evaluate(() => {
      const panel = document.querySelector('[id^="headlessui-dialog-panel-"]');
      if (panel === null) return 0;
      const tabbables = Array.from(
        panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
      );
      tabbables[tabbables.length - 1]?.focus();
      return tabbables.length;
    });
    expect(tabbableCount).toBeGreaterThan(2);

    await page.keyboard.press("Tab");
    expect((await panelTabbableIndex(page)).index).toBe(0);

    await page.keyboard.press("Shift+Tab");
    expect((await panelTabbableIndex(page)).index).toBe(tabbableCount - 1);

    // scroll lock: Headless UIはopen中にroot（html）へoverflow: hiddenを設定して
    // ユーザー入力のscrollを止める。CSS仕様上、rootのoverflow: hiddenはprogrammaticな
    // scrollTo()を妨げないため挙動ベースでは検証できず、wheelシミュレーションは
    // mobile WebKit非対応。よってlock機構のcomputed styleで検証する
    const htmlOverflow = (p: Page) =>
      p.evaluate(() => getComputedStyle(document.documentElement).overflow);
    expect(await htmlOverflow(page)).toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(openButton).toBeFocused();

    // unlock（Esc経路）: close後はroot overflowが解除される
    expect(await htmlOverflow(page)).not.toBe("hidden");

    await openButton.click();
    await expect(panel).toBeVisible();
    expect(await htmlOverflow(page)).toBe("hidden");
    await page.getByRole("button", { name: "メニューを閉じる" }).click();
    await expect(panel).toBeHidden();

    // unlock（閉じるボタン経路）: こちらもroot overflowが解除される
    expect(await htmlOverflow(page)).not.toBe("hidden");
  });
}

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

// 320px / 390pxで可視ラベルの表示・横overflow有無を明示的にparameterizeして検証する（#378 P2）
const spinnerViewports = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
] as const;

for (const viewport of spinnerViewports) {
  test(`PendingLink spinner（reduce, ${viewport.width}px）: ringは非表示になり可視ラベルで状態が示される`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
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

      // ring要素はmotion-reduce:hiddenでdisplay:noneになるため、animationNameでの
      // 検証は不能。ring自体が非表示であることと、代わりに可視ラベルが表示されている
      // ことを検証する（#378 P1の設計変更に伴う置き換え）
      const ring = spinner.locator("span").first();
      const label = spinner.locator("span").last();

      await expect(ring).toBeHidden();
      await expect(label).toBeVisible();
      await expect(label).toHaveText("読み込み中…");

      const [hasNoHorizontalOverflow, viewportSize, labelBox] =
        await Promise.all([
          page.evaluate(
            () =>
              document.documentElement.scrollWidth ===
              document.documentElement.clientWidth
          ),
          page.viewportSize(),
          label.boundingBox(),
        ]);

      // 可視ラベルが原因で横overflowを起こさないこと
      expect(hasNoHorizontalOverflow).toBe(true);
      expect(labelBox).not.toBeNull();
      expect(viewportSize).not.toBeNull();
      if (labelBox && viewportSize) {
        expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(
          viewportSize.width
        );
      }

      await expect(page).toHaveURL(/\/lives\//, { timeout: 15000 });
    } finally {
      await page.unroute("**/*");
    }
  });
}

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

    const animationName = await spinner
      .locator("span")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(animationName).not.toBe("none");

    // reduce時専用の可視ラベルは通常時には表示されない
    const label = spinner.locator("span").last();
    await expect(label).toBeHidden();

    await expect(page).toHaveURL(/\/lives\//, { timeout: 15000 });
  } finally {
    await page.unroute("**/*");
  }
});

test("NavigationProgress（reduce）: barが静止し全幅になる。可視statusも表示される", async ({
  page,
}) => {
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
    const innerBar = progressBar.locator(".animate-pulse");

    const [animationName, outerWidth, innerWidth] = await Promise.all([
      innerBar.evaluate((element) => getComputedStyle(element).animationName),
      progressBar.evaluate((element) => element.getBoundingClientRect().width),
      innerBar.evaluate((element) => element.getBoundingClientRect().width),
    ]);

    expect(animationName).toBe("none");
    // 1/3幅のまま静止すると停滞した進捗に誤読されるため、reduce時は全幅で静止する
    expect(innerWidth).toBeCloseTo(outerWidth, 0);

    // 静止barだけではpendingの意味が読めないため、可視statusが表示されていること
    const visibleStatus = progressBar.getByText("画面を読み込み中…");
    await expect(visibleStatus).toBeVisible();

    // hit testing（#378 P1）: pill追加でwrapperが高さを持つため、pointer-events-noneで
    // overlayがpending中（失敗時最大10秒）に直下のHeader操作を塞がないことをassertする。
    // elementFromPointはpointer-eventsを尊重するため、pill中心のクリック対象が
    // status overlay配下でないことを確認する
    const pillBox = await visibleStatus.boundingBox();
    if (pillBox === null) {
      throw new Error("可視statusのboundingBoxを取得できませんでした。");
    }
    const hitTargetInOverlay = await page.evaluate(
      ({ x, y }) => {
        const element = document.elementFromPoint(x, y);
        return (
          element !== null &&
          element.closest('[role="status"][aria-label="画面遷移中"]') !== null
        );
      },
      {
        x: pillBox.x + pillBox.width / 2,
        y: pillBox.y + pillBox.height / 2,
      }
    );
    expect(hitTargetInOverlay).toBe(false);

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
    const innerBar = progressBar.locator(".animate-pulse");

    const [animationName, outerWidth, innerWidth] = await Promise.all([
      innerBar.evaluate((element) => getComputedStyle(element).animationName),
      progressBar.evaluate((element) => element.getBoundingClientRect().width),
      innerBar.evaluate((element) => element.getBoundingClientRect().width),
    ]);

    expect(animationName).not.toBe("none");
    expect(innerWidth).toBeLessThan(outerWidth * 0.5);

    // reduce時専用の可視statusは通常時には表示されない
    const visibleStatus = progressBar.getByText("画面を読み込み中…");
    await expect(visibleStatus).toBeHidden();

    await expect(page).toHaveURL(/\/members/, { timeout: 15000 });
  } finally {
    await page.unroute("**/*");
  }
});
