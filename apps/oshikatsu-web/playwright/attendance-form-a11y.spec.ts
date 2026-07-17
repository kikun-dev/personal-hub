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
): Promise<{ control: Locator; index: number } | null> {
  const controls = allAttendanceControls(page);
  const count = await controls.count();
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    const recordButton = control.getByRole("button", { name: "参戦を記録" });
    if ((await recordButton.count()) > 0) {
      return { control, index };
    }
  }
  return null;
}

async function deleteAttendanceViaUi(
  page: Page,
  attendanceControl: Locator
): Promise<void> {
  await Promise.all([
    page.waitForEvent("dialog").then((dialog) => dialog.accept()),
    attendanceControl.getByRole("button", { name: "解除" }).click(),
  ]);
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

  const attendanceControlMatch = await findUnregisteredAttendanceControl(page);
  test.skip(attendanceControlMatch === null, "未登録の公演が無いためskip");
  if (attendanceControlMatch === null) {
    throw new Error("未登録の公演のAttendanceControlを取得できませんでした。");
  }
  const { control: attendanceControl, index: attendanceControlIndex } =
    attendanceControlMatch;

  const recordButton = attendanceControl.getByRole("button", {
    name: "参戦を記録",
  });
  await recordButton.click();

  const attendedTypeSelect = attendanceControl.locator(
    'select[id^="attendedType-"]'
  );
  await expect(attendedTypeSelect).toBeFocused();
  await attendedTypeSelect.selectOption({ index: 1 });
  let saveAttempted = false;
  let restored = false;

  try {
    saveAttempted = true;
    await attendanceControl.getByRole("button", { name: "保存" }).click();

    // 保存成功→router.refresh()完了後に「編集」ボタンへfocusが復帰する（#347のpendingFocus機構）
    const editButton = attendanceControl.getByRole("button", { name: "編集" });
    await expect(editButton).toBeFocused({ timeout: 15000 });

    await deleteAttendanceViaUi(page, attendanceControl);

    // 解除成功→router.refresh()完了後に「参戦を記録」ボタンへfocusが復帰する
    await expect(recordButton).toBeFocused({ timeout: 15000 });
    // DBが試験開始前の未登録状態へ戻っていることを原状復帰の確認として合わせてassertする
    await expect(recordButton).toBeVisible();
    restored = true;
  } finally {
    if (saveAttempted && !restored) {
      // focus assertionやrouter.refreshが失敗しても、再読込した永続状態を基準に必ず原状復帰を試みる
      await page.goto(liveHref);
      const cleanupControl = allAttendanceControls(page).nth(
        attendanceControlIndex
      );
      const deleteButton = cleanupControl.getByRole("button", { name: "解除" });
      if (await deleteButton.isVisible()) {
        await deleteAttendanceViaUi(page, cleanupControl);
        await expect(
          cleanupControl.getByRole("button", { name: "参戦を記録" })
        ).toBeVisible({ timeout: 15000 });
      }
    }
  }
});
