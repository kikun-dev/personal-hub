import { expect, test, type Page } from "@playwright/test";
import {
  composite,
  expectContrastAtLeast,
  expectRenderedTextContrast,
  focusWithKeyboard,
  parseColor,
  themes,
  viewports,
} from "./contrast";
import { installTrackedRoute, type DisposeRoute } from "./trackedRoute";

// #486 / GF-SAKA-004 の回帰テスト。
//
// コミット1〜5で実装した「一覧・詳細routeの状態契約」を固定する。
//
//   A. Result status（live region）: CollectionResultStatus（<output>、暗黙role="status"）が
//      aria-atomic="true"を持ち、filter変更で同じnodeの内容だけが更新されること
//      （components/ui/CollectionResultStatus.tsx）。
//   B. filter Empty と reset: filterの結果0件（元データ自体は0件ではない）のとき、
//      no-match文言と「絞り込みを解除」Buttonが出て、keyboardで到達・操作でき、
//      押すと一覧が復帰しURLからgroupIdが消えること（SongBrowser / LiveBrowser）。
//      **true Empty（元データ自体が0件）はローカル/hosted実データ上では決定的に作れないため、
//      本specでは検証しない。** component test（該当Browserの unit test）で担保済み。
//   C. Loading: route group `(list)` のfile-based loading.tsx が一覧routeにのみ適用され、
//      可視の「読み込み中」（role="status" + aria-busy="true"）が出て主要領域が空白でないこと。
//      加えて、詳細route（route group外）へ遷移したときに一覧用loadingが波及しないこと
//      （波及するとlive-detail-attendance-density.spec.ts等の詳細系specに影響するため重要）。
//   D. Not Found: 実在しないが形式は正しいUUIDでdetail routeを開いたとき、h1が1つ・
//      期待するrecovery linkがあり、role="alert"を持たず、keyboardで操作できること。
//
// **Error boundary（error.tsx）はPlaywrightで発火させない。** Issue #486のVerificationに
// 「Loading / Errorを実データや通信障害の偶発性へ依存して発火させない」とあり、Errorは
// 各error.test.tsx（component test）で担保済み。実データ・実通信でerror.tsxを狙って
// 発火させる決定的な手段が無いため、本specの対象から除外する。
//
// theme × viewportの組み合わせを絞る（workers: 1の直列実行のため、全組み合わせを
// 全項目で回すと極端に遅くなる）。
//   - contrast / focus indicator: light/dark × 1440px（interaction-contract.spec.tsと同じ方針。
//     focus tokenはviewportに依存しないtoken固定値のため）
//   - hit area: light × 390px/1440px（interaction-contract.spec.tsと同じ方針。
//     hit areaはviewportで閾値を変えない契約自体の確認が目的で、themeにも依存しない）
//   - page-level horizontal overflowは新規stateをまとめて1specでlight × 390px/1440pxを確認する
//     （各themeループ内でlight側だけ都度確認する箇所と合わせて、Desktop/Mobile両方をカバーする）
//
// 固定IDを書かない方針は維持しつつ、Not Foundは「実在しないが形式は正しいUUID」が必要
// （不正な形式だとDB到達前にusecase層で弾かれ、notFound()ではなく別の失敗になりうる）。
// 実データと衝突しないよう、桁を1種の16進数字で埋めた読みやすい定数として持つ
//（*-not-found.test.tsxのcomponent testと同じ命名慣習）。
const NONEXISTENT_SONG_ID = "99999999-9999-9999-9999-999999999999";
const NONEXISTENT_LIVE_ID = "88888888-8888-8888-8888-888888888888";
const NONEXISTENT_PERFORMANCE_ID = "77777777-7777-7777-7777-777777777777";

// semantic-ui-state.spec.tsの`/lives?groupId=__contrast-test-empty__`と同じ手法。
// 実データのgroupIdと衝突しないsentinel値でfilterを決定的にEmptyへ倒す（Songにも同じ値を流用する）。
const EMPTY_FILTER_GROUP_ID = "__contrast-test-empty__";

const desktopViewport = viewports.find((viewport) => viewport.width === 1440);
if (!desktopViewport) {
  throw new Error("contrast.ts の viewports に 1440px が定義されていません。");
}
const mobileViewport = viewports.find((viewport) => viewport.width === 390);
if (!mobileViewport) {
  throw new Error("contrast.ts の viewports に 390px が定義されていません。");
}
const hitAreaViewports = viewports.filter(
  (viewport) => viewport.width === 390 || viewport.width === 1440
);
if (hitAreaViewports.length !== 2) {
  throw new Error("contrast.ts の viewports に 390px / 1440px が定義されていません。");
}

async function readBodyBackground(page: Page): Promise<string> {
  return page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor);
}

// center-text-contrast.spec.ts / semantic-ui-state.spec.ts と同じ定義。
async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const overflowing = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflowing, `${label} でhorizontal overflowが発生しています`).toBe(false);
}

// reduced-motion.spec.ts の delaySameOriginGetRequests と同じ実装。あちらはfile-privateで
// export されていないため、同じ「pending状態を決定的に表示させる」既存seamをここへ複製する。
async function delaySameOriginGetRequests(
  page: Page,
  delayMs: number
): Promise<DisposeRoute> {
  const currentOrigin = new URL(page.url()).origin;
  return installTrackedRoute(page, "**/*", async (route) => {
    const request = route.request();
    if (
      request.method() === "GET" &&
      new URL(request.url()).origin === currentOrigin
    ) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await route.continue();
  });
}

// ------------------------------------------------------------
// A. Result status（live region）
// ------------------------------------------------------------

type ResultStatusTarget = {
  label: string;
  path: string;
  unit: string;
  groupSelectName: string;
};

const resultStatusTargets: ResultStatusTarget[] = [
  { label: "Songs", path: "/songs", unit: "曲", groupSelectName: "グループで絞り込み" },
  { label: "Lives", path: "/lives", unit: "件", groupSelectName: "出演グループで絞り込み" },
];

for (const target of resultStatusTargets) {
  for (const theme of themes) {
    test(`${target.label}: 件数のresult statusがlive regionとして機能する（${theme} ${desktopViewport.width}px）`, async ({
      page,
    }) => {
      await page.setViewportSize(desktopViewport);
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(target.path);

      const status = page.getByRole("status");
      await expect(
        status,
        `${target.label} にrole="status"の要素がちょうど1つ見つかりません`
      ).toHaveCount(1);
      await expect(status).toHaveAttribute("aria-atomic", "true");

      const initialText = (await status.textContent())?.trim() ?? "";
      expect(
        initialText,
        `${target.label} のresult statusの文言が想定形式（数値+単位）ではありません: "${initialText}"`
      ).toMatch(new RegExp(`^\\d+${target.unit}$`));

      // 同一DOM nodeが維持されているかを、独自属性の残留で確認する
      // （unmount/remountされていれば、この属性は消える）。
      await status.evaluate((element) => {
        element.setAttribute("data-e2e-node-marker", "kept");
      });

      const groupSelect = page.getByRole("combobox", { name: target.groupSelectName });
      await expect(
        groupSelect,
        `${target.label} のグループ絞り込みselectが見つかりません`
      ).toBeVisible();
      const optionCount = await groupSelect.locator("option").count();
      expect(
        optionCount,
        `${target.label} に絞り込み可能なグループがありません` +
          "（複数グループの前提データが必要です。「全グループ」以外の選択肢で件数が変わることを検証するため）"
      ).toBeGreaterThan(1);
      await groupSelect.selectOption({ index: 1 });

      await expect(
        status,
        `${target.label} のresult statusがfilter変更後も更新されていません`
      ).not.toHaveText(initialText);
      await expect(status).toHaveAttribute("aria-atomic", "true");
      await expect(
        status.evaluate((element) => element.getAttribute("data-e2e-node-marker")),
        `${target.label} のresult statusがfilter変更でunmount/remountされています（同一nodeではありません）`
      ).resolves.toBe("kept");

      const bodyBackground = await readBodyBackground(page);
      await expectRenderedTextContrast(status, bodyBackground, `${target.label} result status`);
    });
  }
}

// ------------------------------------------------------------
// B. filter Emptyとreset
// ------------------------------------------------------------

type EmptyFilterTarget = {
  label: string;
  path: string;
  noMatchText: string;
  listItemHrefPrefix: string;
};

const emptyFilterTargets: EmptyFilterTarget[] = [
  {
    label: "Songs",
    path: `/songs?groupId=${EMPTY_FILTER_GROUP_ID}`,
    noMatchText: "条件に一致する楽曲が見つかりません",
    listItemHrefPrefix: "/songs/",
  },
  {
    label: "Lives",
    path: `/lives?groupId=${EMPTY_FILTER_GROUP_ID}`,
    noMatchText: "条件に一致するライブが見つかりません",
    listItemHrefPrefix: "/lives/",
  },
];

const RESET_BUTTON_NAME = "絞り込みを解除";

for (const target of emptyFilterTargets) {
  for (const theme of themes) {
    test(`${target.label}: filter Emptyのreset導線が有効（${theme} ${desktopViewport.width}px）`, async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.setViewportSize(desktopViewport);
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(target.path);

      const noMatchText = page.getByText(target.noMatchText);
      await expect(noMatchText).toBeVisible();
      const resetButton = page.getByRole("button", { name: RESET_BUTTON_NAME });
      await expect(resetButton).toBeVisible();

      const bodyBackground = await readBodyBackground(page);
      await expectRenderedTextContrast(noMatchText, bodyBackground, `${target.label} no-match text`);

      await focusWithKeyboard(page, resetButton);
      await expect(resetButton).toBeFocused();

      const styles = await resetButton.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          outlineColor: style.outlineColor,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          backgroundColor: style.backgroundColor,
        };
      });
      expect(
        styles.outlineStyle,
        `${target.label} のresetボタンのoutlineStyleがnoneです`
      ).not.toBe("none");
      expect(
        styles.outlineWidth,
        `${target.label} のresetボタンのoutlineWidthが2pxではありません`
      ).toBe("2px");
      const buttonBackground = composite(parseColor(styles.backgroundColor), parseColor(bodyBackground));
      expectContrastAtLeast(
        parseColor(styles.outlineColor),
        buttonBackground,
        3,
        `${target.label} resetボタンのfocus indicator`
      );

      // keyboardでfocusしたままEnterで押す（keyboard操作での押下を兼ねて検証する）
      await page.keyboard.press("Enter");

      await expect(
        noMatchText,
        `${target.label} でresetボタンを押しても no-match 文言が消えません`
      ).toHaveCount(0);
      await expect(
        page.locator(`main a[href^="${target.listItemHrefPrefix}"]`).first(),
        `${target.label} でresetボタンを押しても一覧が復帰しません`
      ).toBeVisible();
      await expect(page).not.toHaveURL(/groupId=/);

      if (theme === "light") {
        await expectNoHorizontalOverflow(page, `${target.label} filter empty (${desktopViewport.width}px)`);
      }
    });
  }

  for (const viewport of hitAreaViewports) {
    test(`${target.label}: filter Emptyのresetボタンのhit areaが44px以上（light ${viewport.width}px）`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto(target.path);

      const resetButton = page.getByRole("button", { name: RESET_BUTTON_NAME });
      await expect(resetButton).toBeVisible();
      const box = await resetButton.boundingBox();
      expect(box, `${target.label} のresetボタンのboundingBoxが取得できません`).not.toBeNull();
      expect(
        box?.height,
        `${target.label} のresetボタンの高さが44px未満です（実測${box?.height}px）`
      ).toBeGreaterThanOrEqual(44);
    });
  }
}

// ------------------------------------------------------------
// C. Loading
// ------------------------------------------------------------

// loading.tsx の中身（可視「読み込み中」text / role=status / aria-busy / placeholderの
// aria-hidden / 主要領域が空白でないこと）はcomponent testで固定している
// （app/(authenticated)/{songs,lives}/(list)/loading.test.tsx と *LoadingSkeleton.test.tsx）。
// ここでdelaySameOriginGetRequests経由の「loadingが実際に表示される」検証を行うと、
// header navのprefetch有無で表示されるか否かが変わりタイミング依存になる（実測でLivesのみ
// 落ちた）。Issue #486のVerificationも「Loading / Errorを実データや通信障害の偶発性へ
// 依存して発火させない」としているため、Playwrightでは下のroute-scope回帰だけを見る。

const LOADING_STATUS_SELECTOR = 'p[role="status"][aria-busy="true"]';

test("ライブ詳細への遷移では一覧用loadingが出ない（route group scopeの回帰固定）", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize(desktopViewport);
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/lives");

  const liveLink = page.locator('main a[href^="/lives/"]').first();
  await expect(
    liveLink,
    "ライブ一覧にdetail linkが見つかりません（前提データが存在しない可能性があります）"
  ).toBeVisible();

  const disposeDelay = await delaySameOriginGetRequests(page, 1300);
  try {
    await liveLink.click();

    // クリック直後に一覧用loading.tsx（(list) route group配下）がlives/[id]へ波及していないかを
    // 確認する。波及していれば、client-side navigationの性質上ここで即座に出現するはず
    // （reduced-motion.spec.tsのspinner同様、network応答を待たずに表示される）。
    // Reactのcommitを待つための短いwaitのみ挟む（他specの既存precedentと同じ用途）。
    await page.waitForTimeout(300);
    await expect(
      page.locator(LOADING_STATUS_SELECTOR),
      "ライブ詳細への遷移中に一覧用loading（route group `(list)`配下）が表示されています"
    ).toHaveCount(0);

    await expect(page).toHaveURL(/\/lives\/[^/]+$/, { timeout: 15000 });
  } finally {
    await disposeDelay();
  }
});

// ------------------------------------------------------------
// D. Not Found
// ------------------------------------------------------------

type NotFoundTarget = {
  label: string;
  path: string;
  h1Name: string;
  description: string;
  recoveryLinks: { name: string; href: string }[];
};

const notFoundTargets: NotFoundTarget[] = [
  {
    label: "Song detail",
    path: `/songs/${NONEXISTENT_SONG_ID}`,
    h1Name: "楽曲が見つかりません",
    description: "指定された楽曲は存在しないか、削除された可能性があります。",
    recoveryLinks: [{ name: "← 楽曲一覧", href: "/songs" }],
  },
  {
    label: "Live detail",
    path: `/lives/${NONEXISTENT_LIVE_ID}`,
    h1Name: "ライブが見つかりません",
    description: "指定されたライブは存在しないか、削除された可能性があります。",
    recoveryLinks: [{ name: "← ライブ一覧", href: "/lives" }],
  },
  {
    label: "Setlist detail",
    path: `/lives/${NONEXISTENT_LIVE_ID}/performances/${NONEXISTENT_PERFORMANCE_ID}/setlist`,
    h1Name: "セットリストが見つかりません",
    description: "指定されたセットリストは存在しないか、削除された可能性があります。",
    recoveryLinks: [
      { name: "← ライブ詳細へ戻る", href: `/lives/${NONEXISTENT_LIVE_ID}` },
      { name: "← ライブ一覧", href: "/lives" },
    ],
  },
];

for (const target of notFoundTargets) {
  for (const theme of themes) {
    test(`${target.label}: Not Foundがrole=alertなしでrecovery linkを提供する（${theme} ${desktopViewport.width}px）`, async ({
      page,
    }) => {
      await page.setViewportSize(desktopViewport);
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(target.path);

      const heading = page.getByRole("heading", { level: 1 });
      await expect(
        heading,
        `${target.label} のh1がちょうど1つ見つかりません`
      ).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1, name: target.h1Name })).toBeVisible();
      const description = page.getByText(target.description);
      await expect(description).toBeVisible();
      // Next.jsは全ページへroute announcer（#__next-route-announcer__、role="alert"）を
      // 注入するため、page全体をgetByRole("alert")で見るとNot Found側の実装に関わらず
      // 必ず1件hitする。検証したいのはNot Found本文のsemanticsなので main 配下へ絞る。
      await expect(
        page.locator("main").getByRole("alert"),
        `${target.label} がrole="alert"を持っています（notFound()は通常のページ状態のはずです）`
      ).toHaveCount(0);

      const bodyBackground = await readBodyBackground(page);
      await expectRenderedTextContrast(heading, bodyBackground, `${target.label} h1`);
      await expectRenderedTextContrast(description, bodyBackground, `${target.label} description`);

      for (const link of target.recoveryLinks) {
        const locator = page.getByRole("link", { name: link.name });
        await expect(
          locator,
          `${target.label} のrecovery link「${link.name}」が見つかりません`
        ).toBeVisible();
        await expect(locator).toHaveAttribute("href", link.href);
      }

      const firstLink = page.getByRole("link", { name: target.recoveryLinks[0].name });
      await focusWithKeyboard(page, firstLink);
      await expect(
        firstLink,
        `${target.label} の最初のrecovery linkへkeyboardで到達できません`
      ).toBeFocused();

      if (theme === "light") {
        await expectNoHorizontalOverflow(page, `${target.label} not-found (${desktopViewport.width}px)`);
      }
    });
  }
}

// ------------------------------------------------------------
// E. 横断: page-level horizontal overflow（Mobile代表）
// ------------------------------------------------------------
//
// Desktop 1440pxのoverflow確認は上記A〜Dの各themeループ内（light側）で都度行っている。
// Mobile 390pxはtheme非依存の性質のため、新規state全てをまとめて1specでlightのみ確認する
// （themeを絞ってもリスクは小さい。center-text-contrast.spec.tsと同じ判断）。
test(`新規stateがMobile light ${mobileViewport.width}pxでhorizontal overflowを起こさない`, async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize(mobileViewport);
  await page.emulateMedia({ colorScheme: "light" });

  const paths = [
    "/songs",
    `/songs?groupId=${EMPTY_FILTER_GROUP_ID}`,
    "/lives",
    `/lives?groupId=${EMPTY_FILTER_GROUP_ID}`,
    `/songs/${NONEXISTENT_SONG_ID}`,
    `/lives/${NONEXISTENT_LIVE_ID}`,
    `/lives/${NONEXISTENT_LIVE_ID}/performances/${NONEXISTENT_PERFORMANCE_ID}/setlist`,
  ];

  for (const path of paths) {
    await page.goto(path);
    await expectNoHorizontalOverflow(page, path);
  }
});
