import { expect, test, type Locator, type Page } from "@playwright/test";

// #458: Combobox のキーボード契約のうち、実ブラウザでしか確認できない2点を固定する。
//
// 1. 候補リストが開いていても Tab 1回で次の項目へ抜けられること
//    以前は候補が <button> でタブ順に入っていたため、Tab を押すたびに候補を1件ずつ
//    辿ることになり、候補が551件あるセットリスト編集画面では実質キーボードで
//    先へ進めなかった（#453 の作業中にタブ順を実測して発覚）。
//    jsdom では「タブ順に入るか」を実ブラウザと同じ精度では測れないため、ここで見る。
//
// 2. 矢印で移動した候補がリストの可視範囲に入っていること
//    フォーカスは入力欄に留まり aria-activedescendant で現在候補を示す方式なので、
//    ブラウザ既定のフォーカススクロールが働かない。Combobox 側の scrollIntoView が
//    効いていないと、選んでいる候補が画面外のままになる。
//    jsdom は scrollIntoView も layout も持たないため、これも実ブラウザでしか見られない。
//
// role / aria 属性・Enter / Escape / Tab での開閉といった論理的な契約は
// components/ui/Combobox.test.tsx（component test）側が担当する（#442 の責務分担）。

// 会場 Combobox を持つ管理フォーム。seed 済みデータに依存しないよう新規作成画面を使い、
// 公演行を1つ追加してから触る。
const LIVE_NEW_PATH = "/admin/lives/new";

async function openVenueCombobox(page: Page): Promise<{
  input: Locator;
  listbox: Locator;
}> {
  await page.goto(LIVE_NEW_PATH);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "公演を追加" }).click();

  const input = page.getByRole("combobox", { name: "会場を検索" });
  await expect(input).toBeVisible();

  // focus で開く（既存挙動。#458 では変更していない）
  await input.focus();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();

  return { input, listbox };
}

test("候補リストが開いていてもTab1回でComboboxを抜けられる（#458）", async ({
  page,
}) => {
  const { input, listbox } = await openVenueCombobox(page);

  // 前提: 候補が実際に複数ある状態で測る（0件だとタブ順の検証にならない）
  const optionCount = await page.getByRole("option").count();
  expect(
    optionCount,
    "候補が無い状態ではタブ順の検証にならない。会場データが投入されているか確認すること"
  ).toBeGreaterThan(1);

  // Combobox の直後にある「公演日」。ここへ1回の Tab で到達することが AC。
  // 「候補ではない要素へ移った」だけだと body や想定外の要素でも通ってしまうため、
  // 次のコントロールそのものを指定して固定する。
  // exact: true が必要。Input の日付バリアントは「選択」ボタンへ
  // aria-label="公演日*をカレンダーから選択" を付けており、getByLabel は部分一致なので
  // exact を外すと日付入力とカレンダーボタンの2件にマッチして strict mode 違反になる。
  const nextField = page.getByLabel("公演日*", { exact: true });
  await expect(nextField).toBeVisible();

  await page.keyboard.press("Tab");

  await expect(
    nextField,
    "Tab1回でCombobox直後の「公演日」へ到達していない。候補がタブストップに戻っている可能性がある"
  ).toBeFocused();
  await expect(input).not.toBeFocused();
  // Tab で離脱したらリストも閉じる（#458）
  await expect(listbox).toBeHidden();
});

test("矢印で移動した候補がリストの可視範囲に入る（#458）", async ({ page }) => {
  const { input, listbox } = await openVenueCombobox(page);

  const optionCount = await page.getByRole("option").count();
  // リストは max-h-56。候補が十分にあるときだけスクロール追従を意味のある形で測れる。
  // 少ない環境でも下の assert は自明に成立するので、条件分岐せずそのまま測る。
  const steps = Math.min(optionCount - 1, 20);
  for (let index = 0; index < steps; index += 1) {
    await page.keyboard.press("ArrowDown");
  }

  const activeId = await input.getAttribute("aria-activedescendant");
  expect(activeId, "aria-activedescendantが設定されていない").toBeTruthy();

  const visibility = await listbox.evaluate((list, id: string) => {
    const active = list.querySelector(`[id="${id}"]`);
    if (active === null) {
      return null;
    }
    const listRect = list.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    // 端数を吸収するため1pxだけ許容する
    return {
      aboveTop: listRect.top - activeRect.top,
      belowBottom: activeRect.bottom - listRect.bottom,
    };
  }, activeId as string);

  expect(visibility, "aria-activedescendantが指す候補がlistbox内に見つからない").not.toBeNull();
  expect(
    visibility!.aboveTop,
    "選択中の候補がリストの上端より上にはみ出している（scrollIntoViewが効いていない）"
  ).toBeLessThanOrEqual(1);
  expect(
    visibility!.belowBottom,
    "選択中の候補がリストの下端より下にはみ出している（scrollIntoViewが効いていない）"
  ).toBeLessThanOrEqual(1);
});
