import { expect, test, type ConsoleMessage, type Locator, type Page } from "@playwright/test";
import { composite, expectContrastAtLeast, focusWithKeyboard, parseColor, themes, viewports } from "./contrast";

// #482 / GF-SAKA-002: shared interaction contract の回帰テスト。
//
// interactionStyles.ts が定義する「画面をまたいだ操作契約」のうち、コード変更で
// 気づかず壊しやすい4点を固定する。
//
//   A. Client Reference境界の破損（CF-LIVE-006、最優先）:
//      "use client" module から class文字列（関数以外の値）をServer Componentが importすると、
//      その値がClient Reference proxyになり、DOM上のclass属性に
//      "Attempted to call ... from the server" が混入する。interactionStyles.ts を
//      "use client" を付けないmoduleへ隔離した契約（#482）が壊れていないかを、
//      Live / Song / Member の各detailで確認する。
//   B. focus indicator: focus-visible時のoutlineが2px・隣接背景に対して3:1以上であること。
//   C. hit area: standalone control（back/disclosure/select）は44px以上、
//      inline text linkは24px以上。Issue #482のDecisionにより「hit areaは操作種別で決める」
//      ため、viewportで閾値を変えない（Desktopでもstandalone controlを縮めない）。
//   D. disclosure（MemberSongsSection）のprogrammatic state:
//      aria-expanded / aria-controls が実際のDOM開閉と一致していること。
//
// テストデータの固定IDには依存せず、一覧ページから最初のdetail linkを辿ってhrefを解決する
// （form-focus-ring.spec.tsと同じ方式）。前提データが存在しない場合は無言でskipせず、
// toBeVisible() 等で明示的にfailさせる。

const CLIENT_REFERENCE_LEAK_TEXT = "Attempted to call";

const desktopViewport = viewports.find((viewport) => viewport.width === 1440);
if (!desktopViewport) {
  throw new Error("contrast.ts の viewports に 1440px が定義されていません。");
}
// C: hit areaはviewportで閾値を変えない契約自体の確認が目的のため、
// 代表としてmobile幅とdesktop幅のみ確認する（全viewportを回すと遅くなるため絞る）。
const hitAreaViewports = viewports.filter(
  (viewport) => viewport.width === 390 || viewport.width === 1440
);
if (hitAreaViewports.length !== 2) {
  throw new Error("contrast.ts の viewports に 390px / 1440px が定義されていません。");
}

// メンバー一覧の既定filterは「現役」。卒業メンバーしかいない環境でも一覧が0件に
// ならないよう、在籍状況を「全員」へ広げてからdetail linkを解決する。
async function showAllMembers(page: Page): Promise<void> {
  await page
    .getByRole("combobox", { name: "在籍状況で絞り込み" })
    .selectOption({ label: "全員" });
}

// 一覧ページから最初のdetail linkのhrefを解決する。固定IDに依存しないための共通ヘルパー。
// prepare は一覧側の絞り込みを前提データに合わせるためのフック（例: メンバー一覧の
// 既定filterは「現役」なので、卒業メンバーしかいない環境では0件になる）。
async function resolveFirstDetailHref(
  page: Page,
  listPath: string,
  hrefPrefix: string,
  prepare?: (page: Page) => Promise<void>
): Promise<string> {
  await page.goto(listPath);
  if (prepare) {
    await prepare(page);
  }
  const link = page.locator(`a[href^="${hrefPrefix}"]`).first();
  await expect(
    link,
    `${listPath} にdetail linkが見つかりません（前提データが存在しない可能性があります）`
  ).toBeVisible();
  const href = await link.getAttribute("href");
  if (href === null) {
    throw new Error(`${listPath} の最初のdetail linkにhrefがありませんでした。`);
  }
  return href;
}

// A: DOM上のどの要素のclass属性にもClient Reference由来の文字列が混入していないことを確認する。
async function expectNoClientReferenceLeakInClassAttributes(page: Page): Promise<void> {
  const leaked = await page.evaluate((needle) => {
    return Array.from(document.querySelectorAll("[class]"))
      .map((element) => element.getAttribute("class") ?? "")
      .filter((value) => value.includes(needle));
  }, CLIENT_REFERENCE_LEAK_TEXT);
  expect(
    leaked,
    `class属性にClient Reference境界破損の文字列が混入しています: ${JSON.stringify(leaked)}`
  ).toHaveLength(0);
}

// console errorのうち「Attempted to call」を含むものだけを収集する。
// 既存の無関係なwarning/errorでフレークしないよう、この文字列を含むものだけをfail条件にする。
function collectClientReferenceConsoleErrors(page: Page): string[] {
  const messages: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    const text = message.text();
    if (text.includes(CLIENT_REFERENCE_LEAK_TEXT)) {
      messages.push(text);
    }
  });
  return messages;
}

const detailPages = [
  { label: "Live detail", listPath: "/lives", hrefPrefix: "/lives/" },
  { label: "Song detail", listPath: "/songs", hrefPrefix: "/songs/" },
  { label: "Member detail", listPath: "/members", hrefPrefix: "/members/" },
] as const;

for (const { label, listPath, hrefPrefix } of detailPages) {
  test(`${label}: class属性にClient Reference境界の破損が混入しない（#482 CF-LIVE-006）`, async ({
    page,
  }) => {
    const consoleLeaks = collectClientReferenceConsoleErrors(page);

    const href = await resolveFirstDetailHref(page, listPath, hrefPrefix);
    await page.goto(href);

    await expectNoClientReferenceLeakInClassAttributes(page);
    expect(
      consoleLeaks,
      `console errorにClient Reference境界破損の文字列が混入しています: ${JSON.stringify(consoleLeaks)}`
    ).toHaveLength(0);
  });
}

// B: focus indicator（2px / 3:1）。対象3画面。
type FocusTarget = {
  label: string;
  resolveHref: (page: Page) => Promise<string>;
  locator: (page: Page) => Locator;
  // 対象までのtab stopが既定の40では届かない画面だけ明示的に増やす（#453と同じ方針）。
  maxTabs?: number;
};

const focusTargets: FocusTarget[] = [
  {
    label: "Song detail の ListBackButton",
    resolveHref: (page) => resolveFirstDetailHref(page, "/songs", "/songs/"),
    locator: (page) => page.getByRole("button", { name: "← 楽曲一覧" }),
  },
  {
    label: "Member detail の MemberSongsSection disclosure button",
    resolveHref: (page) => resolveFirstDetailHref(page, "/members", "/members/", showAllMembers),
    locator: (page) => page.getByRole("button", { name: "全曲を表示 ▼" }),
    // ヘッダーnav + 発信情報カードの外部リンク群を経由するため遠い。
    maxTabs: 80,
  },
  {
    label: "Live detail の back link",
    resolveHref: (page) => resolveFirstDetailHref(page, "/lives", "/lives/"),
    locator: (page) =>
      page.getByRole("link", { name: /^← (ライブ一覧へ戻る|.+の出来事へ戻る)$/ }),
  },
];

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

for (const theme of themes) {
  for (const target of focusTargets) {
    // B: focus contrastはviewportに依存しない（token側の固定値のため）。
    // パフォーマンスのため light/dark × 1440pxのみ検証する（Cで390pxのhit areaは別途確認する）。
    test(`${target.label} のfocus indicatorが2px・3:1（${theme} ${desktopViewport.width}px）`, async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.setViewportSize(desktopViewport);
      await page.emulateMedia({ colorScheme: theme });

      const href = await target.resolveHref(page);
      await page.goto(href);

      const element = target.locator(page);
      await expect(
        element,
        `${target.label} が見つかりません（前提データが存在しない可能性があります）`
      ).toBeVisible();

      const bodyBackground = await page
        .locator("body")
        .evaluate((el) => getComputedStyle(el).backgroundColor);

      await focusWithKeyboard(page, element, { maxTabs: target.maxTabs ?? 40 });
      await expect(element).toBeFocused();

      const styles = await readFocusStyles(element);
      expect(styles.outlineStyle, `${target.label} のoutlineStyleがnoneです`).not.toBe(
        "none"
      );
      expect(
        styles.outlineWidth,
        `${target.label} のoutlineWidthが2pxではありません`
      ).toBe("2px");

      const elementBackground = composite(
        parseColor(styles.backgroundColor),
        parseColor(bodyBackground)
      );
      expectContrastAtLeast(
        parseColor(styles.outlineColor),
        elementBackground,
        3,
        `${target.label} focus indicator`
      );
    });
  }
}

// C: hit area（操作種別ベース）。standalone controlは44px以上、inline text linkは24px以上。
// viewportで閾値を変えないことの確認が目的のため、390px（Mobile代表）と1440px（Desktop代表）の
// 両方で同じ閾値を検証する。themeはhit areaに影響しないためlightのみに絞る。

async function openSongListBackButton(page: Page): Promise<Locator> {
  const href = await resolveFirstDetailHref(page, "/songs", "/songs/");
  await page.goto(href);
  const locator = page.getByRole("button", { name: "← 楽曲一覧" });
  await expect(
    locator,
    "Song detail の ListBackButton が見つかりません"
  ).toBeVisible();
  return locator;
}

async function openMemberDisclosureButton(page: Page): Promise<Locator> {
  const href = await resolveFirstDetailHref(page, "/members", "/members/", showAllMembers);
  await page.goto(href);
  const locator = page.getByRole("button", { name: "全曲を表示 ▼" });
  await expect(
    locator,
    "Member detail の MemberSongsSection disclosure button が見つかりません" +
      "（参加楽曲を持つメンバーが一覧の先頭にいない可能性があります）"
  ).toBeVisible();
  return locator;
}

async function openLiveGroupFilterSelect(page: Page): Promise<Locator> {
  await page.goto("/lives");
  const locator = page.getByLabel("出演グループで絞り込み");
  await expect(locator, "ライブ一覧の絞り込みselectが見つかりません").toBeVisible();
  return locator;
}

// Song detail の inline text link（収録リリース / 披露ライブ）。
// inlineTargetClass（"py-1"）はheader navなど無関係な要素も持つ汎用utilityなので、
// class選択子では対象を特定できない。main配下の関連resourceへのhrefで特定する。
async function openSongInlineTextLink(page: Page): Promise<Locator> {
  const href = await resolveFirstDetailHref(page, "/songs", "/songs/");
  await page.goto(href);
  const locator = page
    .locator('main a[href^="/releases/"], main a[href^="/lives/"]')
    .first();
  await expect(
    locator,
    "Song detail のinline text link（収録リリースまたは披露ライブ）が見つかりません" +
      "（該当データを持つ楽曲が一覧の先頭にいない可能性があります）"
  ).toBeVisible();
  return locator;
}

const standaloneHitAreaTargets: { label: string; open: (page: Page) => Promise<Locator> }[] = [
  { label: "Song detail の ListBackButton", open: openSongListBackButton },
  {
    label: "Member detail の MemberSongsSection disclosure button",
    open: openMemberDisclosureButton,
  },
  { label: "Live一覧の絞り込みselect", open: openLiveGroupFilterSelect },
];

for (const viewport of hitAreaViewports) {
  for (const target of standaloneHitAreaTargets) {
    test(`${target.label} のhit areaが44px以上（light ${viewport.width}px）`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: "light" });

      const locator = await target.open(page);
      const box = await locator.boundingBox();
      expect(box, `${target.label} のboundingBoxが取得できません`).not.toBeNull();
      expect(
        box?.height,
        `${target.label} の高さが44px未満です（実測${box?.height}px）`
      ).toBeGreaterThanOrEqual(44);
    });
  }

  test(`Song detail のinline text linkのhit areaが24px以上（light ${viewport.width}px）`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: "light" });

    const locator = await openSongInlineTextLink(page);
    const box = await locator.boundingBox();
    expect(box, "inline text linkのboundingBoxが取得できません").not.toBeNull();
    expect(
      box?.height,
      `inline text linkの高さが24px未満です（実測${box?.height}px）`
    ).toBeGreaterThanOrEqual(24);
  });
}

// D: MemberSongsSection disclosureのprogrammatic state。
test("MemberSongsSectionのdisclosureがprogrammatic stateを正しく持つ（#482 D）", async ({
  page,
}) => {
  const href = await resolveFirstDetailHref(page, "/members", "/members/", showAllMembers);
  await page.goto(href);

  const collapsedButton = page.getByRole("button", { name: "全曲を表示 ▼" });
  await expect(
    collapsedButton,
    "MemberSongsSectionのdisclosure buttonが見つかりません" +
      "（参加楽曲を持つメンバーが一覧の先頭にいない可能性があります）"
  ).toBeVisible();
  await expect(collapsedButton).toHaveAttribute("aria-expanded", "false");

  const controlsId = await collapsedButton.getAttribute("aria-controls");
  expect(controlsId, "aria-controlsが設定されていません").not.toBeNull();
  // idにReactのuseIdが生成するコロンを含みうるため、CSS ID選択子ではなく属性選択子で探す。
  const region = page.locator(`[id="${controlsId}"]`);
  await expect(
    region,
    `aria-controlsが指すid=${controlsId}の要素がDOMに存在しません`
  ).toHaveCount(1);

  // 展開するとaccessible nameが「閉じる ▲」へ変わるため、nameベースのlocatorでは
  // 追跡できない。開閉で変わらないaria-controlsで同じbuttonを指し続ける。
  const button = page.locator(`button[aria-controls="${controlsId}"]`);
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(button).toHaveText("閉じる ▲");

  const songLinksInRegion = region.getByRole("link");
  await expect(
    songLinksInRegion.first(),
    "展開領域に楽曲linkが表示されません"
  ).toBeVisible();
});
