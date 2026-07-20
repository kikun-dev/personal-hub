import { expect, test } from "@playwright/test";

// #403: モバイルドロワーはセクション見出しを持たず、項目をフラットに並べる。
// 順序・adminOnly出し分け・ログアウト分離・44px touch targetを固定する。

const FLAT_ORDER_BASE = [
  "メンバー",
  "楽曲",
  "リリース",
  "ライブ",
  "制作陣",
  "会場",
  "聖地マップ",
  "Wiki",
  "マイページ",
];

test("モバイルドロワーはセクション見出しを持たずフラットに項目を並べる（#403）", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "メニューを開く" }).click();
  // Dialog root は relative かつ子が position:fixed のため自身は zero-box になる。
  // 開通確認は panel 内の可視要素で行い、dialog は子孫クエリのスコープとして使う。
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "メニューを閉じる" })
  ).toBeVisible();

  // セクション見出しが表示されないこと
  for (const heading of ["主要閲覧", "アーカイブ", "アカウント"]) {
    await expect(dialog.getByText(heading, { exact: true })).toHaveCount(0);
  }

  // フラットな順序（adminなら末尾に「管理」。先頭9件の順序は role に依らず固定）
  const names = await dialog.locator("nav a").allInnerTexts();
  expect(names.slice(0, FLAT_ORDER_BASE.length)).toEqual(FLAT_ORDER_BASE);
  expect([FLAT_ORDER_BASE.length, FLAT_ORDER_BASE.length + 1]).toContain(
    names.length
  );
  if (names.length === FLAT_ORDER_BASE.length + 1) {
    expect(names[FLAT_ORDER_BASE.length]).toBe("管理");
  }

  // ログアウトは nav の外（最下部）に分離している
  await expect(dialog.getByRole("button", { name: "ログアウト" })).toBeVisible();
  await expect(dialog.locator("nav").getByText("ログアウト")).toHaveCount(0);

  // 各項目は44px以上の touch target を持つ
  const firstItem = dialog.getByRole("link", { name: "メンバー", exact: true });
  const box = await firstItem.boundingBox();
  if (box === null) {
    throw new Error("ドロワー項目のboundingBoxを取得できませんでした。");
  }
  expect(box.height).toBeGreaterThanOrEqual(44);
});
