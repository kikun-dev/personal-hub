import { expect, test, type Locator, type Page } from "@playwright/test";

// #363: fallback carousel（最大18枚）の全cardにAttendanceControl（form/state/effect持ち）が
// 常時mountされていたことで発生していた「59 focus target・反復するCTA・setlistより下に
// 押される自分の参戦記録」を、展開disclosure + 最大1公演のconditional mountで解消したことの
// 回帰検証。既存 live-detail-overflow.spec.ts と同じfixture（乃木坂46 真夏の全国ツアー2026）を使う。
//
// #375レビュー指摘: 「有効context」テストはcarousel内でセトリ簡易表示（ol要素）を持つcardを
// 走査して対象を選ぶ（seedの並び順・固定日付への依存を避ける）。日付はcard自身のh3テキスト
// （M/D）から、年はライブ名の4桁西暦から組み立てる。
// canonical seedだけの環境ではseeds/040_seed_e2e_setlist_fixture.sqlが対象ツアーの先頭公演へ
// setlist 1曲を投入するため、このテストはskipされずに必ず実行される。実データ運用中のDBでは
// ユーザー入力のsetlistが対象になる。走査で該当cardが見つからない場合のtest.skipは、
// fixture未適用環境向けの防御として残す（silent passにしない）。

const fallbackLiveName = /乃木坂46 真夏の全国ツアー2026/;

async function resolveFallbackLiveHref(page: Page): Promise<string> {
  await page.goto("/lives");
  const liveLink = page.getByRole("link", { name: fallbackLiveName }).first();
  await expect(liveLink).toBeVisible();

  const href = await liveLink.getAttribute("href");
  if (href === null) {
    throw new Error("fallback検証用ライブのhrefを取得できませんでした。");
  }

  return href;
}

function carousel(page: Page): Locator {
  return page.getByTestId("live-performance-carousel");
}

// disclosure button（未登録「参戦を記録」/登録済み「記録を開く」/展開中「閉じる」）
function disclosureButtons(page: Page): Locator {
  return carousel(page).getByRole("button", {
    name: /^(参戦を記録|記録を開く|閉じる)$/,
  });
}

// carousel内のgroupを走査し、指定名のbuttonを持つ最初のgroupを返す。無ければnull。
// 「記録を開く」（登録済み）/「参戦を記録」（未登録、展開前）の判定に使う
async function findGroupWithButton(
  page: Page,
  buttonName: string
): Promise<{ group: Locator; index: number } | null> {
  const groups = carousel(page).getByRole("group");
  const count = await groups.count();
  for (let index = 0; index < count; index += 1) {
    const group = groups.nth(index);
    if ((await group.getByRole("button", { name: buttonName }).count()) > 0) {
      return { group, index };
    }
  }
  return null;
}

test("fallback（直接訪問）はcarousel内にform要素も空状態copyも持たない", async ({
  page,
}) => {
  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const container = carousel(page);
  await expect(container).toBeVisible();

  await expect(container.locator("form")).toHaveCount(0);
  await expect(container.getByText("参戦記録はまだありません")).toHaveCount(0);

  // #375レビュー指摘: collapsed時のdetail regionはhiddenであることを明示的に検証する
  // （aria-expandedとdetail regionの可視性が常に一致する構造になったため）
  const panels = container.locator('[id^="attendance-panel-"]');
  const panelCount = await panels.count();
  expect(panelCount).toBeGreaterThan(0);
  for (let index = 0; index < panelCount; index += 1) {
    await expect(panels.nth(index)).toBeHidden();
  }
});

test("登録済みcardは記録を開くでsummary→full controlが開き、focusはtoggleに残る", async ({
  page,
}) => {
  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const match = await findGroupWithButton(page, "記録を開く");
  // データに依存するため、登録済みcardが無い場合はskipする
  test.skip(match === null, "登録済みcardが無いためskip");
  if (match === null) {
    throw new Error("登録済みcardを取得できませんでした。");
  }
  const { group: registeredGroup } = match;

  const container = carousel(page);
  // disclosure buttonはクリックでラベルが「閉じる」へ変わるため、name非依存の
  // aria-controls属性で同一要素を追跡する（card内でaria-controlsを持つbuttonは1つ）
  const disclosure = registeredGroup.locator("button[aria-controls]");
  await expect(disclosure).toHaveText("記録を開く");
  await disclosure.click();

  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await expect(disclosure).toHaveText("閉じる");
  // 登録済みcardはsummary→full control（「編集」ボタン）が現れる
  await expect(registeredGroup.getByRole("button", { name: "編集" })).toBeVisible();
  await expect(container.locator("div[aria-busy]")).toHaveCount(1);

  // 展開後もfocusはtoggle button自身に残る（プログラムでfocusを移動しない）
  await expect(disclosure).toBeFocused();
});

test("未登録cardは参戦を記録1回でformが開き参戦種別へfocusする", async ({
  page,
}) => {
  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const match = await findGroupWithButton(page, "参戦を記録");
  // データに依存するため、未登録cardが無い場合はskipする
  test.skip(match === null, "未登録cardが無いためskip");
  if (match === null) {
    throw new Error("未登録cardを取得できませんでした。");
  }
  const { group: unregisteredGroup } = match;

  const disclosure = unregisteredGroup.locator("button[aria-controls]");
  await expect(disclosure).toHaveText("参戦を記録");
  // #375レビュー指摘: defaultEditingにより、展開クリック1回でformが直接開く
  // （「参戦を記録」→内側の「参戦を記録」という二段階CTAを解消）
  await disclosure.click();

  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  const attendedTypeSelect = unregisteredGroup.locator(
    'select[id^="attendedType-"]'
  );
  await expect(attendedTypeSelect).toBeVisible();
  await expect(attendedTypeSelect).toBeFocused();
});

test("別cardを展開すると前のcardがcollapseする", async ({ page }) => {
  // 1件目が未登録cardの場合、defaultEditingにより展開直後から編集中になるため、
  // 別cardへの切替時に破棄確認dialogが出る（仕様）。acceptして切替を続行する
  // （未処理のdialogはPlaywrightがdismissし、切替が中断されてしまう）
  page.on("dialog", (dialog) => dialog.accept());

  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const container = carousel(page);
  const groups = container.getByRole("group");
  const groupCount = await groups.count();
  test.skip(groupCount < 2, "比較対象となる2件目のcardが無いためskip");

  const firstGroup = groups.first();
  const secondGroup = groups.nth(1);

  // labelはクリックで「閉じる」へ変わるため、name非依存のaria-controlsで追跡する
  const firstDisclosure = firstGroup.locator("button[aria-controls]");
  await firstDisclosure.click();
  await expect(firstDisclosure).toHaveAttribute("aria-expanded", "true");

  const secondDisclosure = secondGroup.locator("button[aria-controls]");
  await expect(secondDisclosure).toBeVisible();
  await secondDisclosure.click();

  // 1件目はcollapseし、disclosure labelが元（「参戦を記録」/「記録を開く」）に戻る
  await expect(firstDisclosure).toHaveAttribute("aria-expanded", "false");
  await expect(firstDisclosure).toHaveText(/^(参戦を記録|記録を開く)$/);

  await expect(secondDisclosure).toHaveAttribute("aria-expanded", "true");
  // 同時mountは常に最大1件
  // #375レビュー指摘: 未登録cardではform内fieldへ、登録済みcardではtoggleへfocusが
  // 分岐するため、focus assertはせずaria-expanded/aria-busy件数の検証に絞る
  await expect(container.locator("div[aria-busy]")).toHaveCount(1);
});

test("carouselはrole=regionでアクセシブルネームを持ち、cardはrole=groupで日付+時刻由来の名前を持つ", async ({
  page,
}) => {
  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const container = carousel(page);
  await expect(container).toHaveAccessibleName("公演ごとの情報");

  const firstGroup = container.getByRole("group").first();
  await expect(firstGroup).toHaveAccessibleName(/^\d{1,2}\/\d{1,2}\(.+\)/);

  // #375レビュー指摘: 同日複数公演を区別できるよう、accessible nameはh3の
  // 日付+時刻テキストとそのまま一致することを確認する（同日区別の決定的検証はunit test側が担う）
  const heading = firstGroup.locator("h3");
  const headingText = (await heading.textContent())?.trim();
  if (!headingText) {
    throw new Error("先頭cardのh3テキストを取得できませんでした。");
  }
  await expect(firstGroup).toHaveAccessibleName(headingText);
});

test("登録済みcardのcompact表示にAttendedTypeBadgeが見える", async ({ page }) => {
  // #375レビュー指摘: 登録済みcardが無い環境ではskipせず、未登録cardで登録をarrangeして
  // 決定的に検証する。arrangeはDBを変更するため、共有ユーザーデータのレース回避でdesktopのみ実行する
  test.skip(
    test.info().project.name !== "desktop",
    "登録arrangeの可能性があるDB変更のためdesktopのみ実行"
  );

  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const registeredMatch = await findGroupWithButton(page, "記録を開く");

  let targetIndex: number;
  let arranged = false;

  if (registeredMatch !== null) {
    targetIndex = registeredMatch.index;
  } else {
    const unregisteredMatch = await findGroupWithButton(page, "参戦を記録");
    test.skip(
      unregisteredMatch === null,
      "登録済み/未登録いずれのcardも無いためskip"
    );
    if (unregisteredMatch === null) {
      throw new Error("未登録cardを取得できませんでした。");
    }
    targetIndex = unregisteredMatch.index;

    const { group: unregisteredGroup } = unregisteredMatch;
    const disclosure = unregisteredGroup.locator("button[aria-controls]");
    await disclosure.click(); // defaultEditingでformが直接開く

    const attendedTypeSelect = unregisteredGroup.locator(
      'select[id^="attendedType-"]'
    );
    await expect(attendedTypeSelect).toBeFocused();
    await attendedTypeSelect.selectOption({ index: 1 }); // 現地
    await unregisteredGroup.getByRole("button", { name: "保存" }).click();
    await expect(
      unregisteredGroup.getByRole("button", { name: "編集" })
    ).toBeVisible({ timeout: 15000 });
    arranged = true;

    await page.reload();
  }

  try {
    const targetGroup = carousel(page).getByRole("group").nth(targetIndex);
    // reload後（またはarrangeしていない場合はcollapsedのまま）でcompact表示を確認する
    await expect(
      targetGroup.getByText(/^(現地|ライブビューイング|配信)$/)
    ).toBeVisible();
  } finally {
    if (arranged) {
      const cleanupGroup = carousel(page).getByRole("group").nth(targetIndex);
      const cleanupDisclosure = cleanupGroup.locator("button[aria-controls]");
      await cleanupDisclosure.click();
      await Promise.all([
        page.waitForEvent("dialog").then((dialog) => dialog.accept()),
        cleanupGroup.getByRole("button", { name: "解除" }).click(),
      ]);
      await expect(
        cleanupGroup.getByRole("button", { name: "参戦を記録" })
      ).toBeVisible({ timeout: 15000 });
    }
  }
});

test("保存処理中はcarousel内の全disclosureがdisabledになる", async ({
  page,
}) => {
  // #375レビュー指摘: pending中のunmount迂回防止（disclosure lock）の回帰検証。
  // 共有ユーザーデータへの書き込みを伴うため、desktopのみ実行する
  test.skip(
    test.info().project.name !== "desktop",
    "共有ユーザーデータを変更するためdesktopのみ実行"
  );

  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const match = await findGroupWithButton(page, "参戦を記録");
  test.skip(match === null, "未登録cardが無いためskip");
  if (match === null) {
    throw new Error("未登録cardを取得できませんでした。");
  }
  const { group: unregisteredGroup, index: unregisteredIndex } = match;

  page.on("dialog", (dialog) => dialog.accept());

  const disclosure = unregisteredGroup.locator("button[aria-controls]");
  await disclosure.click(); // defaultEditingでformが直接開く

  const attendedTypeSelect = unregisteredGroup.locator(
    'select[id^="attendedType-"]'
  );
  await expect(attendedTypeSelect).toBeFocused();
  await attendedTypeSelect.selectOption({ index: 1 }); // 現地

  // 保存のPOSTを遅延させ、pending中のUI状態を観測できるようにする
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    await route.continue();
  });

  let saveAttempted = false;
  let restored = false;

  try {
    saveAttempted = true;
    await unregisteredGroup.getByRole("button", { name: "保存" }).click();

    // 保存中はcarousel内の全disclosureがdisabledになる（同時編集によるunmount迂回を防ぐlock）
    const allDisclosures = disclosureButtons(page);
    const disclosureCount = await allDisclosures.count();
    expect(disclosureCount).toBeGreaterThan(0);
    for (let index = 0; index < disclosureCount; index += 1) {
      await expect(allDisclosures.nth(index)).toBeDisabled();
    }

    // 保存完了後は「編集」ボタンが現れ、disclosureはenabledへ戻る
    await expect(
      unregisteredGroup.getByRole("button", { name: "編集" })
    ).toBeVisible({ timeout: 15000 });
    for (let index = 0; index < disclosureCount; index += 1) {
      await expect(allDisclosures.nth(index)).toBeEnabled();
    }

    await unregisteredGroup.getByRole("button", { name: "解除" }).click();
    await expect(
      unregisteredGroup.getByRole("button", { name: "参戦を記録" })
    ).toBeVisible({ timeout: 15000 });
    restored = true;
  } finally {
    await page.unroute("**/*");
    if (saveAttempted && !restored) {
      // focus/UI assertionが失敗しても、再読込した永続状態を基準に必ず原状復帰を試みる
      await page.goto(liveHref);
      const cleanupGroup = carousel(page).getByRole("group").nth(unregisteredIndex);
      const cleanupDisclosure = cleanupGroup.locator("button[aria-controls]");
      if (await cleanupDisclosure.isVisible()) {
        await cleanupDisclosure.click();
      }
      const deleteButton = cleanupGroup.getByRole("button", { name: "解除" });
      if (await deleteButton.isVisible()) {
        // confirm dialogは冒頭で登録したpage.onハンドラがacceptする
        // （waitForEventを併用すると同じdialogを二重acceptしてしまう）
        await deleteButton.click();
        await expect(
          cleanupGroup.getByRole("button", { name: "参戦を記録" })
        ).toBeVisible({ timeout: 15000 });
      }
    }
  }
});

test("有効context（この公演）で参戦記録labelがセットリストlabelよりDOM順で前にある", async ({
  page,
}) => {
  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const liveNameHeading = page.getByRole("heading", { level: 1 });
  const liveName = (await liveNameHeading.textContent())?.trim() ?? "";
  const yearMatch = liveName.match(/20\d{2}/);
  test.skip(yearMatch === null, "ライブ名から年を抽出できないためskip");
  if (yearMatch === null) {
    throw new Error("ライブ名から年を抽出できませんでした。");
  }
  const year = yearMatch[0];

  const groups = carousel(page).getByRole("group");
  const groupCount = await groups.count();

  let targetPerformanceId: string | null = null;
  let targetMonthDay: string | null = null;

  for (let index = 0; index < groupCount; index += 1) {
    const group = groups.nth(index);
    // セトリ簡易表示（PerformanceSetlistSummary）はol要素で描画される
    if ((await group.locator("ol").count()) === 0) continue;

    const headingText = (await group.locator("h3").textContent())?.trim() ?? "";
    const dateMatch = headingText.match(/^(\d{1,2})\/(\d{1,2})/);
    if (dateMatch === null) continue;

    const setlistLink = group.getByRole("link", { name: "詳細を見る →" });
    const href = await setlistLink.getAttribute("href");
    const idMatch = href?.match(/\/performances\/([0-9a-fA-F-]{36})\/setlist$/);
    if (!idMatch) continue;

    targetPerformanceId = idMatch[1];
    targetMonthDay = `${dateMatch[1].padStart(2, "0")}-${dateMatch[2].padStart(2, "0")}`;
    break;
  }

  test.skip(
    targetPerformanceId === null,
    "セットリストを持つcardが無いためskip"
  );
  if (targetPerformanceId === null || targetMonthDay === null) {
    throw new Error("セットリスト付きcardを特定できませんでした。");
  }

  const contextualHref = `${liveHref}?date=${year}-${targetMonthDay}&performance=${targetPerformanceId}`;
  await page.goto(contextualHref);

  // 有効contextとして認識されている（fallbackへ落ちていない）ことを、
  // 「この公演」セクション見出しの存在で確認する
  const thisPerformanceSection = page.locator("section", {
    has: page.getByRole("heading", { name: "この公演", level: 2 }),
  });
  await expect(
    thisPerformanceSection.getByRole("heading", { name: "この公演" })
  ).toBeVisible();

  // #375レビュー指摘: 「参戦記録」「セットリスト」のDOM順比較は「この公演」セクション内に
  // scopeし、他セクション（ツアー全体overview等）の同名テキストとの誤matchを避ける
  const attendanceLabel = thisPerformanceSection.getByText("参戦記録", {
    exact: true,
  });
  await expect(attendanceLabel).toBeVisible();

  const setlistLabel = thisPerformanceSection.getByText("セットリスト", {
    exact: true,
  });
  // セットリストを持つcardを選定しているため、対象公演には必ずセットリストlabelが描画される
  await expect(setlistLabel).toBeVisible();

  const order = await thisPerformanceSection.evaluate((sectionEl) => {
    const walker = document.createTreeWalker(sectionEl, NodeFilter.SHOW_TEXT);
    let attendanceIndex = -1;
    let setlistIndex = -1;
    let index = 0;
    let node = walker.nextNode();
    while (node !== null) {
      const text = node.textContent?.trim();
      if (text === "参戦記録" && attendanceIndex === -1) attendanceIndex = index;
      if (text === "セットリスト" && setlistIndex === -1) setlistIndex = index;
      index += 1;
      node = walker.nextNode();
    }
    return { attendanceIndex, setlistIndex };
  });

  expect(order.attendanceIndex).toBeGreaterThanOrEqual(0);
  expect(order.setlistIndex).toBeGreaterThanOrEqual(0);
  expect(order.attendanceIndex).toBeLessThan(order.setlistIndex);
});

// #375レビュー指摘: 320/390pxのnarrow viewportでもattendance actions（disclosure/
// 保存・キャンセル/編集・解除）が44px以上のhit areaを持つことを検証する。
// formを開くだけでmutationは発生しない範囲で確認する（保存はクリックしない）
for (const width of [320, 390]) {
  test(`${width}px viewportでattendance actionsが44px以上のhit areaを持つ`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });

    const liveHref = await resolveFallbackLiveHref(page);
    await page.goto(liveHref);

    const firstGroup = carousel(page).getByRole("group").first();
    const disclosure = firstGroup.locator("button[aria-controls]");
    await expect(disclosure).toBeVisible();

    const disclosureBox = await disclosure.boundingBox();
    if (disclosureBox === null) {
      throw new Error("disclosure buttonのboundingBoxを取得できませんでした。");
    }
    expect(disclosureBox.height).toBeGreaterThanOrEqual(44);

    await disclosure.click();

    // 未登録cardは保存/キャンセル、登録済みcardは編集/解除のいずれかが現れる
    const actionButtons = firstGroup.getByRole("button", {
      name: /^(保存|キャンセル|編集|解除)$/,
    });
    const actionCount = await actionButtons.count();
    expect(actionCount).toBeGreaterThan(0);
    for (let index = 0; index < actionCount; index += 1) {
      const box = await actionButtons.nth(index).boundingBox();
      if (box === null) {
        throw new Error("action buttonのboundingBoxを取得できませんでした。");
      }
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
}
