import { expect, test, type Locator, type Page } from "@playwright/test";

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

// AttendanceControl のroot divに固有のclass組み合わせ。
// 参戦登録の有無（「参戦を記録」/「編集」）どちらの状態でも一覧最初の公演を一意に指す。
function firstAttendanceControl(page: Page): Locator {
  return page
    .locator("div.space-y-2.border-t.border-border-subtle.pt-3")
    .first();
}

async function openFirstAttendanceForm(
  attendanceControl: Locator
): Promise<Locator> {
  const trigger = attendanceControl.getByRole("button", {
    name: /^(参戦を記録|編集)$/,
  });
  await expect(trigger).toBeVisible();
  await trigger.click();
  return trigger;
}

test("フォームを開くと参戦種別へfocusが移る", async ({ page }) => {
  const liveHref = await resolveLiveHref(page);
  await page.goto(liveHref);

  const attendanceControl = firstAttendanceControl(page);
  await openFirstAttendanceForm(attendanceControl);

  const attendedTypeSelect = attendanceControl.locator(
    'select[id^="attendedType-"]'
  );
  await expect(attendedTypeSelect).toBeFocused();
});

test("参戦種別を空のまま保存するとfield errorとfocusが連動する", async ({
  page,
}) => {
  const liveHref = await resolveLiveHref(page);
  await page.goto(liveHref);

  const attendanceControl = firstAttendanceControl(page);
  await openFirstAttendanceForm(attendanceControl);

  const attendedTypeSelect = attendanceControl.locator(
    'select[id^="attendedType-"]'
  );
  await expect(attendedTypeSelect).toBeFocused();

  // DBを変更しない範囲で検証するため、空値のまま保存してusecase側のvalidation errorのみを起こす
  await attendedTypeSelect.selectOption("");
  await attendanceControl.getByRole("button", { name: "保存" }).click();

  await expect(attendedTypeSelect).toHaveAttribute("aria-invalid", "true");

  const selectId = await attendedTypeSelect.getAttribute("id");
  if (selectId === null) {
    throw new Error("参戦種別selectのidを取得できませんでした。");
  }
  const errorId = `${selectId}-error`;

  const errorMessage = attendanceControl.locator(`#${errorId}`);
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toHaveText("参戦種別を選択してください");
  await expect(attendedTypeSelect).toHaveAttribute(
    "aria-describedby",
    errorId
  );
  await expect(attendedTypeSelect).toBeFocused();

  // _formエラーは発生しないケースのため、FormErrorBanner（role="alert"）は表示されない
  await expect(attendanceControl.getByRole("alert")).toHaveCount(0);
});

test("キャンセルするとfocusが元のボタンへ戻る", async ({ page }) => {
  const liveHref = await resolveLiveHref(page);
  await page.goto(liveHref);

  const attendanceControl = firstAttendanceControl(page);
  const trigger = attendanceControl.getByRole("button", {
    name: /^(参戦を記録|編集)$/,
  });
  await expect(trigger).toBeVisible();
  const triggerName = (await trigger.textContent())?.trim();
  if (!triggerName) {
    throw new Error("トリガーボタンのラベルを取得できませんでした。");
  }

  await trigger.click();
  await attendanceControl.getByRole("button", { name: "キャンセル" }).click();

  const triggerAfterCancel = attendanceControl.getByRole("button", {
    name: triggerName,
  });
  await expect(triggerAfterCancel).toBeFocused();
});
