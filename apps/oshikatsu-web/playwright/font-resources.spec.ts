import { expect, test, type Page } from "@playwright/test";

// #397: webfont を全廃し、Primary / Wiki とも font ファイルを転送しない。
// Wiki のコード/Markdown は system monospace（等幅）契約を維持する。

async function collectFontRequests(page: Page, url: string): Promise<string[]> {
  const fonts: string[] = [];
  page.on("request", (request) => {
    if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(request.url())) {
      fonts.push(request.url());
    }
  });
  await page.goto(url, { waitUntil: "networkidle" });
  return fonts;
}

test("Primary routeはfont resourceを転送しない（#397）", async ({ page }) => {
  const fonts = await collectFontRequests(page, "/");
  expect(fonts, `font転送あり: ${fonts.join(", ")}`).toEqual([]);
});

test("Wiki編集面もfont resourceを転送せず、mono契約をsystem monospaceで維持する（#397）", async ({
  page,
}) => {
  const fonts = await collectFontRequests(page, "/wiki/new");
  expect(fonts, `font転送あり: ${fonts.join(", ")}`).toEqual([]);

  // font-mono の Markdown 本文欄が等幅（monospace）で、Geist へ依存しない
  const monoField = page.locator("textarea.font-mono").first();
  await expect(monoField).toBeVisible();
  const family = (
    await monoField.evaluate((element) => getComputedStyle(element).fontFamily)
  ).toLowerCase();
  expect(family).toContain("monospace");
  expect(family).not.toContain("geist");
});
