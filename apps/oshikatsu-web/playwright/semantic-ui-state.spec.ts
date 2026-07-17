import { expect, test, type Locator, type Page } from "@playwright/test";

type Rgba = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const themes = ["light", "dark"] as const;
const viewports = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
] as const;

function parseColor(value: string): Rgba {
  const normalized = value.trim();
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    const expanded =
      hex.length === 3
        ? hex
            .split("")
            .map((character) => character.repeat(2))
            .join("")
        : hex;
    if (expanded.length !== 6) {
      throw new Error(`未対応のhex colorです: ${value}`);
    }
    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
      a: 1,
    };
  }

  const match = normalized.match(/^rgba?\(([^)]+)\)$/);
  if (!match) {
    throw new Error(`未対応のCSS colorです: ${value}`);
  }
  const parts = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`CSS colorを解析できません: ${value}`);
  }
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts[3] ?? 1,
  };
}

function composite(foreground: Rgba, background: Rgba): Rgba {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  return {
    r:
      (foreground.r * foreground.a +
        background.r * background.a * (1 - foreground.a)) /
      alpha,
    g:
      (foreground.g * foreground.a +
        background.g * background.a * (1 - foreground.a)) /
      alpha,
    b:
      (foreground.b * foreground.a +
        background.b * background.a * (1 - foreground.a)) /
      alpha,
    a: alpha,
  };
}

function relativeLuminance(color: Rgba): number {
  const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: Rgba, background: Rgba): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

function expectAaContrast(
  foreground: string,
  background: string,
  label: string
): void {
  const backgroundColor = parseColor(background);
  const foregroundColor = composite(parseColor(foreground), backgroundColor);
  expectAaContrastColors(foregroundColor, backgroundColor, label);
}

function expectAaContrastColors(
  foreground: Rgba,
  background: Rgba,
  label: string
): void {
  expectContrastAtLeast(foreground, background, 4.5, label);
}

function expectContrastAtLeast(
  foreground: Rgba,
  background: Rgba,
  minimumRatio: number,
  label: string
): void {
  expect(
    contrastRatio(foreground, background),
    `${label}のcontrastが${minimumRatio}:1未満です`
  ).toBeGreaterThanOrEqual(minimumRatio);
}

async function expectRenderedTextContrast(
  locator: Locator,
  background: string,
  label: string
): Promise<void> {
  const colors = await locator.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).color)
  );
  expect(colors.length, `${label}がrenderされていません`).toBeGreaterThan(0);
  for (const [index, color] of colors.entries()) {
    expectAaContrast(color, background, `${label}[${index}]`);
  }
}

async function focusWithKeyboard(page: Page, target: Locator): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
  }

  throw new Error("current navigationへTabで到達できませんでした。");
}

for (const theme of themes) {
  for (const viewport of viewports) {
    test(`${theme} ${viewport.width}pxでsemantic UI stateを維持する`, async ({
      page,
      browserName,
    }) => {
      test.setTimeout(60_000);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme });

      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: "今日のSakalog" })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "日付から探す" })
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Sakalog" })).toHaveAttribute(
        "aria-current",
        "page"
      );

      await page.goto("/lives");
      await expect(page.getByRole("heading", { name: "ライブ" })).toBeVisible();

      let currentLink: Locator;
      if (viewport.width < 768) {
        await page.getByRole("button", { name: "メニューを開く" }).click();
        currentLink = page
          .getByRole("dialog")
          .getByRole("link", { name: "ライブ", exact: true });
      } else {
        currentLink = page
          .locator("header nav")
          .first()
          .getByRole("link", { name: "ライブ", exact: true });
      }
      await expect(currentLink).toBeVisible();
      await expect(currentLink).toHaveAttribute("aria-current", "page");

      const currentStyles = await currentLink.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          fontWeight: Number(style.fontWeight),
        };
      });
      const bodyBackground = await page
        .locator("body")
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(currentStyles.backgroundColor).not.toBe(bodyBackground);
      expect(currentStyles.fontWeight).toBeGreaterThanOrEqual(500);

      await focusWithKeyboard(page, currentLink);
      const focusStyles = await currentLink.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          outlineColor: style.outlineColor,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
        };
      });
      expect(focusStyles.outlineWidth).toBe("2px");
      expect(focusStyles.outlineStyle).not.toBe("none");
      expectAaContrast(
        focusStyles.outlineColor,
        currentStyles.backgroundColor,
        "focus indicator"
      );

      if (viewport.width < 768) {
        await page.getByRole("button", { name: "メニューを閉じる" }).click();
      }

      const primaryText = page.getByRole("heading", { name: "ライブ" });
      const secondaryText = page
        .locator("header .text-foreground-secondary:visible")
        .first();
      const badge = page.locator('[data-ui="badge"]:visible').first();
      await expect(secondaryText).toBeVisible();
      await expect(badge).toBeVisible();

      const [primaryColor, secondaryColor, badgeStyles, semanticTokens] =
        await Promise.all([
          primaryText.evaluate((element) => getComputedStyle(element).color),
          secondaryText.evaluate((element) => getComputedStyle(element).color),
          badge.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              color: style.color,
              backgroundColor: style.backgroundColor,
            };
          }),
          page.evaluate(() => {
            const style = getComputedStyle(document.documentElement);
            return {
              danger: style.getPropertyValue("--danger"),
              dangerForeground:
                style.getPropertyValue("--danger-foreground"),
            };
          }),
        ]);

      expectAaContrast(primaryColor, bodyBackground, "primary text");
      expectAaContrast(secondaryColor, bodyBackground, "secondary text");
      const badgeBackground = composite(
        parseColor(badgeStyles.backgroundColor),
        parseColor(bodyBackground)
      );
      expectAaContrastColors(
        composite(parseColor(badgeStyles.color), badgeBackground),
        badgeBackground,
        "badge"
      );
      expectAaContrast(
        semanticTokens.dangerForeground,
        semanticTokens.danger,
        "danger pair"
      );

      await test.step("Chromium accessible tree spot check", async (step) => {
        step.skip(
          browserName !== "chromium" || viewport.width < 768,
          "Chromiumのaccessible tree確認はdesktop viewportで実施します。"
        );
        const snapshot = await page.locator("header").ariaSnapshot();
        expect(snapshot).toContain("navigation");
        expect(snapshot).toContain("ライブ");
      });
    });
  }
}

for (const theme of themes) {
  test(`${theme}でライブ本文とSecondary Buttonのrendered contrastを維持する`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/lives");
    await expect(page.getByRole("heading", { name: "ライブ" })).toBeVisible();

    const bodyBackground = await page
      .locator("body")
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    await expectRenderedTextContrast(
      page.locator('[data-ui="live-count"]'),
      bodyBackground,
      "live count"
    );
    await expectRenderedTextContrast(
      page.locator('[data-ui="live-type"]'),
      bodyBackground,
      "live type"
    );
    await expectRenderedTextContrast(
      page.locator('[data-ui="live-date"]'),
      bodyBackground,
      "live date"
    );

    const liveCard = page.locator('[data-ui="live-card"]').first();
    await expect(liveCard).toBeVisible();
    const liveHref = await liveCard.getAttribute("href");
    if (liveHref === null) {
      throw new Error("Secondary Button検証用のライブURLを取得できませんでした。");
    }

    await page.goto("/lives?groupId=__contrast-test-empty__");
    const emptyState = page.locator('[data-ui="live-empty"]');
    await expect(emptyState).toBeVisible();
    await expectRenderedTextContrast(emptyState, bodyBackground, "live empty state");

    await page.goto(liveHref);
    const secondaryButton = page
      .locator('[data-ui="button"][data-variant="secondary"]')
      .first();
    await expect(secondaryButton).toBeVisible();
    const buttonStyles = await secondaryButton.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderTopColor,
      };
    });
    expectContrastAtLeast(
      parseColor(buttonStyles.borderColor),
      parseColor(buttonStyles.backgroundColor),
      3,
      "secondary button border"
    );
  });
}
