import { expect, test } from "@playwright/test";

// #411: authenticated shell の最大幅を max-w-5xl(1024px) から max-w-7xl(1280px) へ広げた。
// Tailwind preflightがbox-sizing: border-boxのため、max-w-7xl px-4のborder-box幅は
// paddingを含めて最大1280pxになる。Header shellとmainの左右端が揃っていること、
// 拡幅後もdocument幅をoverflowしないことをdesktop/mobile双方のprojectで検証する。

test("1440pxでmainがmax-w-7xl(1280px)に収まりHeaderと左右端が揃う", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const main = page.locator("main");
  const header = page.locator('[data-ui="app-shell-header"]');

  const mainBox = await main.boundingBox();
  if (mainBox === null) {
    throw new Error("mainのboundingBoxを取得できませんでした。");
  }
  const headerBox = await header.boundingBox();
  if (headerBox === null) {
    throw new Error("Header shellのboundingBoxを取得できませんでした。");
  }

  expect(mainBox.width).toBeCloseTo(1280, 0);
  // (1440 - 1280) / 2 = 80px の中央寄せマージン
  expect(mainBox.x).toBeCloseTo(80, 0);

  // Header shellとmainが同じ左右端（同じmax-w-7xl契約）を共有していること
  expect(headerBox.width).toBeCloseTo(mainBox.width, 0);
  expect(headerBox.x).toBeCloseTo(mainBox.x, 0);

  const { scrollWidth, clientWidth } = await page.evaluate(() => {
    const root = document.scrollingElement;
    if (root === null) {
      throw new Error("document.scrollingElementがありません。");
    }
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
  });
  expect(scrollWidth).toBe(clientWidth);
});

test("402px(iPhone 17相当)で拡幅後もdocument幅をoverflowしない", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 844 });
  await page.goto("/");

  const { scrollWidth, clientWidth } = await page.evaluate(() => {
    const root = document.scrollingElement;
    if (root === null) {
      throw new Error("document.scrollingElementがありません。");
    }
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
  });
  expect(scrollWidth).toBe(clientWidth);
});
