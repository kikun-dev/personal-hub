import { expect, test } from "@playwright/test";
import {
  expectRenderedTextContrast,
  parseColor,
  themes,
} from "./contrast";

const FIXTURE_SPOT_NAME = "【E2E】聖地スポット検証";

function toRoundedRgb(value: string): { r: number; g: number; b: number } {
  const { r, g, b } = parseColor(value);
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

for (const theme of themes) {
  test(`${theme}でInfoWindow内の全テキストが固定light surfaceに対して4.5:1以上`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/spots");

    // Google Maps 自身もキーボードショートカット用tableを注入するため、
    // アプリのスポット詳細linkを持つtableだけへ絞る（#470）。
    const spotsTable = page
      .locator("table")
      .filter({ has: page.locator('a[href^="/spots/"]') });
    const fixtureRow = spotsTable.locator("tbody tr").filter({
      has: page.getByRole("link", { name: FIXTURE_SPOT_NAME, exact: true }),
    });
    test.skip(
      (await fixtureRow.count()) === 0,
      "remote環境にはseed 042のE2E spot fixtureが無いためskip"
    );

    await fixtureRow.click();

    const content = page.locator('[data-ui="spot-info-window"]');
    await expect(content).toBeVisible();
    const googleSurface = page
      .locator(".gm-style-iw")
      .filter({ has: content });
    await expect(googleSurface).toBeVisible();

    const [contentBackground, googleSurfaceBackground] = await Promise.all([
      content.evaluate((element) => getComputedStyle(element).backgroundColor),
      googleSurface.evaluate(
        (element) => getComputedStyle(element).backgroundColor
      ),
    ]);

    // Google側の外部surfaceとコンポーネントが所有するlocal surfaceは、
    // ページthemeにかかわらず同じ不透明な白であることを固定する。
    expect(toRoundedRgb(googleSurfaceBackground)).toEqual({
      r: 255,
      g: 255,
      b: 255,
    });
    expect(toRoundedRgb(contentBackground)).toEqual(
      toRoundedRgb(googleSurfaceBackground)
    );
    expect(parseColor(contentBackground).a).toBe(1);

    const textElements = content.locator("p, a");
    await expect(textElements).toHaveCount(6);
    for (const expectedText of [
      FIXTURE_SPOT_NAME,
      "ライブ",
      "東京都",
      "Googleマップで開く",
      "詳細を見る",
      "編集",
    ]) {
      await expect(content.getByText(expectedText, { exact: true })).toBeVisible();
    }

    await expectRenderedTextContrast(
      textElements,
      contentBackground,
      `${theme} InfoWindow text`
    );
  });
}
