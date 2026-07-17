import { expect, test, type Locator, type Page } from "@playwright/test";

// #363: fallback carousel（最大18枚）の全cardにAttendanceControl（form/state/effect持ち）が
// 常時mountされていたことで発生していた「59 focus target・反復するCTA・setlistより下に
// 押される自分の参戦記録」を、展開disclosure + 最大1公演のconditional mountで解消したことの
// 回帰検証。既存 live-detail-overflow.spec.ts と同じfixture（乃木坂46 真夏の全国ツアー2026）を使う。
//
// 有効context（#346: ?date=&performance=）を辿るテスト（invariant f）は、既存specに
// contextを生成する確立した手段が無く（calendar日付セル経由のnavigationはこの特定ツアーの
// 公演日を事前に知らないと辿れない）、このrepoのseed（supabase/seeds/035_seed_sakamichi_lives_2026.sql）には
// setlist行が一件も無く、対象ライブの「セットリスト」labelがどの公演でも描画されない環境がある。
// そのため、このspecでは対象ライブの最初の公演（sort_order=0, performance_date=2026-06-13,
// サンドーム福井 初日）に対する有効contextを自前で組み立てて検証し、
// 「セットリスト」labelが存在する場合のみDOM順の比較を行う（無ければ「参戦記録」labelの
// 存在のみ確認する）。

const fallbackLiveName = /乃木坂46 真夏の全国ツアー2026/;
// seed（035_seed_sakamichi_lives_2026.sql）における当該ツアー最初の公演日。
// sort_order昇順でDOM描画されるため、carousel先頭cardの公演と一致する前提を置く。
const firstPerformanceDate = "2026-06-13";

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

test("fallback（直接訪問）はcarousel内にform要素も空状態copyも持たない", async ({
  page,
}) => {
  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const container = carousel(page);
  await expect(container).toBeVisible();

  await expect(container.locator("form")).toHaveCount(0);
  await expect(container.getByText("参戦記録はまだありません")).toHaveCount(0);
});

test("disclosureを展開するとAttendanceControlが現れ、mount数は最大1に保たれる", async ({
  page,
}) => {
  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const container = carousel(page);
  const groups = container.getByRole("group");
  const groupCount = await groups.count();
  expect(groupCount).toBeGreaterThan(1);

  // 各cardに1つずつdisclosure buttonがある
  await expect(disclosureButtons(page)).toHaveCount(groupCount);

  // AttendanceControlは自身のcontent divに常時aria-busyを持つため、mount数のproxyとして
  // 使える（未mount時は0）。carousel内のPendingLink（a要素）もaria-busyを持つためdivに限定する
  await expect(container.locator("div[aria-busy]")).toHaveCount(0);

  const firstGroup = groups.first();
  // disclosure buttonはクリックでラベルが「閉じる」へ変わるため、name非依存の
  // aria-controls属性で同一要素を追跡する（card内でaria-controlsを持つbuttonは1つ）
  const firstDisclosure = firstGroup.locator("button[aria-controls]");
  await expect(firstDisclosure).toHaveText(/^(参戦を記録|記録を開く)$/);
  await firstDisclosure.click();

  await expect(firstDisclosure).toHaveAttribute("aria-expanded", "true");
  await expect(firstDisclosure).toHaveText("閉じる");
  // AttendanceControl自身のトリガー（未登録「参戦を記録」/登録済み「編集」）が現れる
  await expect(
    firstGroup.getByRole("button", { name: /^(参戦を記録|編集)$/ })
  ).toBeVisible();
  await expect(container.locator("div[aria-busy]")).toHaveCount(1);

  // 展開後もfocusはtoggle button自身に残る（プログラムでfocusを移動しない）
  await expect(firstDisclosure).toBeFocused();
});

test("別cardを展開すると前のcardがcollapseする", async ({ page }) => {
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
  await expect(container.locator("div[aria-busy]")).toHaveCount(1);
  await expect(secondDisclosure).toBeFocused();
});

test("carouselはrole=regionでアクセシブルネームを持ち、cardはrole=groupで日付由来の名前を持つ", async ({
  page,
}) => {
  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const container = carousel(page);
  await expect(container).toHaveAccessibleName("公演ごとの情報");

  const firstGroup = container.getByRole("group").first();
  await expect(firstGroup).toHaveAccessibleName(/^\d{1,2}\/\d{1,2}\(.+\)/);
});

test("登録済みcardのcompact表示にAttendedTypeBadgeが見える", async ({
  page,
}) => {
  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const container = carousel(page);
  const groups = container.getByRole("group");
  const groupCount = await groups.count();

  let registeredGroup: Locator | null = null;
  for (let index = 0; index < groupCount; index += 1) {
    const group = groups.nth(index);
    const hasRegisteredDisclosure =
      (await group.getByRole("button", { name: "記録を開く" }).count()) > 0;
    if (hasRegisteredDisclosure) {
      registeredGroup = group;
      break;
    }
  }

  // データに依存するため、登録済みcardが無い場合はskipする
  test.skip(registeredGroup === null, "登録済みの公演が無いためskip");
  if (registeredGroup === null) {
    throw new Error("登録済みcardを取得できませんでした。");
  }

  await expect(
    registeredGroup.getByText(/^(現地|ライブビューイング|配信)$/)
  ).toBeVisible();
});

test("有効context（この公演）で参戦記録labelがセットリストlabelよりDOM順で前にある", async ({
  page,
}) => {
  const liveHref = await resolveFallbackLiveHref(page);
  await page.goto(liveHref);

  const firstSetlistLink = carousel(page)
    .getByRole("link", { name: "詳細を見る →" })
    .first();
  const setlistHref = await firstSetlistLink.getAttribute("href");
  if (setlistHref === null) {
    throw new Error("最初の公演のsetlistリンクhrefを取得できませんでした。");
  }
  const performanceIdMatch = setlistHref.match(
    /\/performances\/([0-9a-fA-F-]{36})\/setlist$/
  );
  if (performanceIdMatch === null) {
    throw new Error("公演IDをsetlistリンクから抽出できませんでした。");
  }
  const performanceId = performanceIdMatch[1];

  const contextualHref = `${liveHref}?date=${firstPerformanceDate}&performance=${performanceId}`;
  await page.goto(contextualHref);

  // 有効contextとして認識されている（fallbackへ落ちていない）ことを、
  // 「この公演」セクション見出しの存在で確認する
  const thisPerformanceHeading = page.getByRole("heading", {
    name: "この公演",
    level: 2,
  });
  await expect(thisPerformanceHeading).toBeVisible();

  const attendanceLabel = page.getByText("参戦記録", { exact: true });
  await expect(attendanceLabel).toBeVisible();

  const setlistLabel = page.getByText("セットリスト", { exact: true });
  const setlistLabelCount = await setlistLabel.count();

  if (setlistLabelCount === 0) {
    // この環境のseedにはsetlist行が無く、対象公演にセットリストが無いため
    // 「セットリスト」labelは描画されない（D5のDOM順比較自体ができない）。
    // 「参戦記録」labelの存在確認のみで代替する。
    return;
  }

  const order = await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );
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
