import { expect, test } from "@playwright/test";
import {
  MOBILE_NAV_ITEMS,
  filterNavItemsForRole,
} from "@/lib/navigation";

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
const FLAT_ORDER_ADMIN = [...FLAT_ORDER_BASE, "管理"];

test("モバイルナビ項目はviewer/adminのrole別順序を維持する（#403）", () => {
  const labelsForRole = (isAdmin: boolean) =>
    filterNavItemsForRole(MOBILE_NAV_ITEMS, isAdmin).map((item) => item.label);

  expect(labelsForRole(false)).toEqual(FLAT_ORDER_BASE);
  expect(labelsForRole(true)).toEqual(FLAT_ORDER_ADMIN);
});

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

  // 保存済み認証状態のroleに応じ、viewer/adminどちらかの完全な順序と一致すること
  const names = await dialog.locator("nav a").allInnerTexts();
  expect([FLAT_ORDER_BASE, FLAT_ORDER_ADMIN]).toContainEqual(names);

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
