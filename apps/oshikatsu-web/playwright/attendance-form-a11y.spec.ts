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

// ライブ詳細ページ内のAttendanceControlすべてを列挙する。firstAttendanceControlと同じclass組み合わせ
function allAttendanceControls(page: Page): Locator {
  return page.locator("div.space-y-2.border-t.border-border-subtle.pt-3");
}

// 「参戦を記録」ボタンを持つ = 未登録の公演のAttendanceControlを探す。無ければnull
async function findUnregisteredAttendanceControl(
  page: Page
): Promise<Locator | null> {
  const controls = allAttendanceControls(page);
  const count = await controls.count();
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    const recordButton = control.getByRole("button", { name: "参戦を記録" });
    if ((await recordButton.count()) > 0) {
      return control;
    }
  }
  return null;
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

test("複数fieldがinvalidな場合に表示順で最初のfieldへfocusする", async ({
  page,
}) => {
  const liveHref = await resolveLiveHref(page);
  await page.goto(liveHref);

  const attendanceControl = firstAttendanceControl(page);
  await openFirstAttendanceForm(attendanceControl);

  const attendedTypeSelect = attendanceControl.locator(
    'select[id^="attendedType-"]'
  );
  const seatNoteInput = attendanceControl.locator('input[id^="seatNote-"]');
  const noteTextarea = attendanceControl.locator('textarea[id^="note-"]');
  await expect(attendedTypeSelect).toBeFocused();

  // UTF-16 code unit数で501文字になるマルチバイト文字を使い、MAX_NOTE_LENGTH(500)を超えさせる
  const overLengthText = "あ".repeat(501);

  // Phase 1: 参戦種別は空のまま、座席メモ・メモを500文字超にして3 fieldすべてinvalidにする
  await attendedTypeSelect.selectOption("");
  await seatNoteInput.fill(overLengthText);
  await noteTextarea.fill(overLengthText);
  await attendanceControl.getByRole("button", { name: "保存" }).click();

  // DBを変更しない範囲で検証するため、validation errorのみを起こす（repo.upsertへは到達しない）
  await expect(attendedTypeSelect).toBeFocused();
  await expect(attendedTypeSelect).toHaveAttribute("aria-invalid", "true");
  await expect(seatNoteInput).toHaveAttribute("aria-invalid", "true");
  await expect(noteTextarea).toHaveAttribute("aria-invalid", "true");

  const seatNoteId = await seatNoteInput.getAttribute("id");
  const noteId = await noteTextarea.getAttribute("id");
  if (seatNoteId === null || noteId === null) {
    throw new Error("座席メモ/メモのidを取得できませんでした。");
  }
  const seatNoteErrorId = `${seatNoteId}-error`;
  const noteErrorId = `${noteId}-error`;

  const seatNoteError = attendanceControl.locator(`#${seatNoteErrorId}`);
  const noteError = attendanceControl.locator(`#${noteErrorId}`);
  await expect(seatNoteError).toHaveText("座席メモは500文字以内で入力してください");
  await expect(noteError).toHaveText("メモは500文字以内で入力してください");
  await expect(seatNoteInput).toHaveAttribute(
    "aria-describedby",
    seatNoteErrorId
  );
  await expect(noteTextarea).toHaveAttribute("aria-describedby", noteErrorId);

  // Phase 2: 参戦種別のみ解消して再送信。表示順で最初のinvalid fieldは座席メモになる
  await attendedTypeSelect.selectOption({ index: 1 });
  await attendanceControl.getByRole("button", { name: "保存" }).click();

  await expect(seatNoteInput).toBeFocused();
  // updateがfield更新と同時にエラーをクリアし、再validationでも参戦種別はエラーにならないため戻らない
  await expect(attendedTypeSelect).not.toHaveAttribute("aria-invalid", "true");
});

test("保存と解除の完了後にfocusがトリガーボタンへ復帰する（#347 regression）", async ({
  page,
}) => {
  // desktop/mobileの2 projectは同一ユーザーで並行実行され、同じattendance行への
  // 書き込みがレースするため、viewport非依存のこの検証はdesktopのみで実行する
  test.skip(
    test.info().project.name !== "desktop",
    "同一ユーザーデータへの並行書き込みを避けるためdesktopのみ実行"
  );

  const liveHref = await resolveLiveHref(page);
  await page.goto(liveHref);

  const attendanceControl = await findUnregisteredAttendanceControl(page);
  test.skip(attendanceControl === null, "未登録の公演が無いためskip");
  if (attendanceControl === null) {
    throw new Error("未登録の公演のAttendanceControlを取得できませんでした。");
  }

  const recordButton = attendanceControl.getByRole("button", {
    name: "参戦を記録",
  });
  await recordButton.click();

  const attendedTypeSelect = attendanceControl.locator(
    'select[id^="attendedType-"]'
  );
  await expect(attendedTypeSelect).toBeFocused();
  await attendedTypeSelect.selectOption({ index: 1 });
  await attendanceControl.getByRole("button", { name: "保存" }).click();

  // 保存成功→router.refresh()完了後に「編集」ボタンへfocusが復帰する（#347のpendingFocus機構）
  const editButton = attendanceControl.getByRole("button", { name: "編集" });
  await expect(editButton).toBeFocused({ timeout: 15000 });

  // window.confirmが出るため、クリック前にdialog handlerを登録してacceptする
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await attendanceControl.getByRole("button", { name: "解除" }).click();

  // 解除成功→router.refresh()完了後に「参戦を記録」ボタンへfocusが復帰する
  await expect(recordButton).toBeFocused({ timeout: 15000 });
  // DBが試験開始前の未登録状態へ戻っていることを原状復帰の確認として合わせてassertする
  await expect(recordButton).toBeVisible();
});
