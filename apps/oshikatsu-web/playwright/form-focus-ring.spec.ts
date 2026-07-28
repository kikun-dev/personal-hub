import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  composite,
  expectContrastAtLeast,
  parseColor,
  themes,
  viewports,
} from "./contrast";

// #376: shared form controls（Select / Input / Textarea）のfocus ringを
// semantic focus-ring tokenへ統一した契約の回帰テスト。代表formとしてPR #375の
// 参戦記録form（AttendanceControl: 参戦種別=Select / 座席メモ=Input / メモ=Textarea）を
// 使い、light/dark × 320/390/1440pxでkeyboard focusの2px indicatorとcontrastを検証する。

const fallbackLiveName = /乃木坂46 真夏の全国ツアー2026/;

async function resolveLiveHref(page: Page): Promise<string> {
  await page.goto("/lives");
  const liveLink = page.getByRole("link", { name: fallbackLiveName }).first();
  await expect(liveLink).toBeVisible();
  const href = await liveLink.getAttribute("href");
  if (href === null) {
    throw new Error("参戦記録検証用ライブのhrefを取得できませんでした。");
  }
  return href;
}

// PerformanceAttendanceArea（#363）のroot div。一覧最初の公演を一意に指す。
function firstAttendanceControl(page: Page): Locator {
  return page
    .locator("div.space-y-2.border-t.border-border-subtle.pt-3")
    .first();
}

// 一覧最初の公演の参戦記録formを開く。未登録cardは展開と同時にform表示、
// 登録済みcardは「編集」クリックでform表示（attendance-form-a11yと同じ導線）。
async function openFirstAttendanceForm(page: Page): Promise<Locator> {
  const control = firstAttendanceControl(page);
  const disclosureButton = control.getByRole("button", {
    name: /^(参戦を記録|記録を開く)$/,
  });
  await expect(disclosureButton).toBeVisible();
  await disclosureButton.click();

  await expect(
    control.getByRole("button", { name: /^(編集|キャンセル)$/ }).first()
  ).toBeVisible();

  const editButton = control.getByRole("button", { name: "編集" });
  if ((await editButton.count()) > 0) {
    await editButton.click();
  }
  return control;
}

type FocusStyles = {
  outlineColor: string;
  outlineStyle: string;
  outlineWidth: string;
  backgroundColor: string;
};

async function readFocusStyles(locator: Locator): Promise<FocusStyles> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineColor: style.outlineColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      backgroundColor: style.backgroundColor,
    };
  });
}

// keyboard focus時の2px focus-ringと、focus色 vs 隣接背景の3:1以上を検証する。
// 隣接背景はcontrol自身の背景をbody背景へcompositeした実効色を使う。
async function expectFocusRing(
  page: Page,
  field: Locator,
  bodyBackground: string,
  label: string
): Promise<void> {
  await expect(field).toBeFocused();
  const styles = await readFocusStyles(field);
  expect(styles.outlineStyle, `${label}のoutlineStyleがnoneです`).not.toBe("none");
  expect(styles.outlineWidth, `${label}のoutlineWidthが2pxではありません`).toBe(
    "2px"
  );

  const fieldBackground = composite(
    parseColor(styles.backgroundColor),
    parseColor(bodyBackground)
  );
  // focus-ring tokenはopaque（alpha由来ではない）ため、composite不要でそのまま比較する。
  expectContrastAtLeast(
    parseColor(styles.outlineColor),
    fieldBackground,
    3,
    `${label} focus indicator`
  );
}

for (const theme of themes) {
  for (const viewport of viewports) {
    test(`shared form controlのfocus ringが2px・3:1（${theme} ${viewport.width}px）`, async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme });

      const liveHref = await resolveLiveHref(page);
      await page.goto(liveHref);

      const control = await openFirstAttendanceForm(page);
      const bodyBackground = await page
        .locator("body")
        .evaluate((element) => getComputedStyle(element).backgroundColor);

      const attendedType = control.locator('select[id^="attendedType-"]');
      const seatNote = control.locator('input[id^="seatNote-"]');
      const note = control.locator('textarea[id^="note-"]');

      // form open直後はSelectがprogrammatic focus。keyboard操作（Tab）を経由して
      // 各fieldへ移ることで、text field以外のSelectも:focus-visibleを確実にmatchさせる。
      await expect(attendedType).toBeFocused();

      await page.keyboard.press("Tab");
      await expectFocusRing(page, seatNote, bodyBackground, "座席メモ Input");

      await page.keyboard.press("Tab");
      await expectFocusRing(page, note, bodyBackground, "メモ Textarea");

      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Shift+Tab");
      await expectFocusRing(page, attendedType, bodyBackground, "参戦種別 Select");
    });
  }
}

for (const theme of themes) {
  test(`error stateでもfocus indicatorとaria契約が同時に判別できる（${theme}）`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ colorScheme: theme });

    const liveHref = await resolveLiveHref(page);
    await page.goto(liveHref);

    const control = await openFirstAttendanceForm(page);
    const attendedType = control.locator('select[id^="attendedType-"]');
    await expect(attendedType).toBeFocused();

    // DBを変更しない範囲で、空値のまま保存してusecase側のvalidation errorのみ起こす。
    await attendedType.selectOption("");
    await control.getByRole("button", { name: "保存" }).click();

    await expect(attendedType).toHaveAttribute("aria-invalid", "true");
    const describedBy = await attendedType.getAttribute("aria-describedby");
    expect(describedBy, "error時にaria-describedbyが付与されていません").toBeTruthy();

    // 保存後のfocus復帰はprogrammatic focusのため、keyboard往復（Tab→Shift+Tab）で
    // Selectを:focus-visible状態にし直してから、2px indicatorとaria契約の同時成立を検証する。
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(attendedType).toHaveAttribute("aria-invalid", "true");

    const bodyBackground = await page
      .locator("body")
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    await expectFocusRing(
      page,
      attendedType,
      bodyBackground,
      "error時の参戦種別 Select"
    );
  });
}
