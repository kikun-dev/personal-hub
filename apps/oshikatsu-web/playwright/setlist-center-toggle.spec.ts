import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  composite,
  expectAaContrastColors,
  expectContrastAtLeast,
  focusWithKeyboard,
  parseColor,
  themes,
  viewports,
  type Rgba,
} from "./contrast";

// #453: セットリスト「センター切り替え」（C ボタン）の見た目を契約として固定する spec。
//
// AC「選択状態を色以外でも判別できる」を、色（contrast）だけでなく形（border-radius）・
// 太さ（font-weight）・ラベル（C）で確認する。加えてレイアウト安定（state 変化で
// サイズが変わらない）と横スクロール非発生も見る。
//
// ## なぜ focus ring の「clearance」を上下左右すべてで assert するのか（#441）
// 候補グリッド（SetlistEditor.tsx の `grid max-h-40 ... overflow-y-auto p-1`）は
// `overflow-y: auto` を持つ。CSS 仕様上、片方の軸が `visible` 以外になると
// もう片方の `visible` は `auto` に計算されるため、**この要素は上下左右すべてで
// clip 境界になる**。focus ring は 2px outline + 2px offset ぶん要素の外側へ描かれるので、
// グリッドの端にある候補では ring が切れる。#441 ではこの切れを「一番右の列だけを見て」
// 見逃した。よってここでは **先頭 / 最後 / 右端（right が最大）** の3つを対象にし、
// 4辺すべてで 4px（offset 2px + width 2px）以上の余白を要求する。
// この assert を「1つ見れば十分」と簡約すると #441 の見逃しがそのまま再発する。
//
// ## なぜ outline 色を「遷移が落ち着いてから」読むのか（#441）
// C ボタンは `transition-colors` を持ち、Tailwind v4 の transition-colors には
// `outline-color` が含まれる。focus 直後にそのまま読むと遷移途中の値（currentColor 寄り）が
// 返り、contrast の assert がフレークする。#441 の手動確認で実際に踏んだ。
// そのため `waitForOutlineColorSettled` で **値が変化しなくなるまで rAF で待つ**。
// 固定時間の待ちではなく実際の条件を待つので、遷移時間が変わっても壊れない。

// seed 041 が投入する決定的 UUID（supabase/seeds/041_seed_e2e_setlist_member_fixture.sql）
const FIXTURE_LIVE_ID = "e2e00000-0000-4000-8000-000000000001";
const FIXTURE_PERFORMANCE_ID = "e2e00000-0000-4000-8000-000000000002";
const SETLIST_EDIT_PATH = `/lives/${FIXTURE_LIVE_ID}/performances/${FIXTURE_PERFORMANCE_ID}/setlist/edit`;

// fixture のメンバー数。18人 → 390px（grid-cols-2）で9行となり max-h-40（160px）を超える。
const FIXTURE_MEMBER_COUNT = 18;

// このライブはローカル Supabase の seed にしか存在しない。既定の `pnpm test:e2e` は
// remote project を向くため live が無く、page.tsx の notFound() で 404 になる。
// remote 実行を fail させず、意図した skip として扱う（playwright/README.md の既存慣行）。
const SKIP_REASON =
  "seed 041（【E2E】センター切り替え検証）を投入したローカルSupabase専用のfixtureです。" +
  "`pnpm --filter oshikatsu-web test:e2e:local -- playwright/setlist-center-toggle.spec.ts` で実行してください。";

const CENTER_TOGGLE_SELECTOR = '[data-ui="setlist-center-toggle"]';

// focus ring は outline-offset 2px + outline-width 2px。clip 境界との余白がこれ未満だと ring が欠ける。
const MIN_FOCUS_CLEARANCE_PX = 4;

// 色以外の判別手段のしきい値（selected=font-bold(700) / unselected=font-medium(500)）
const BOLD_FONT_WEIGHT = 600;

// outline-color の遷移が落ち着くまでの上限。transition-colors の既定 duration は 150ms。
const OUTLINE_SETTLE_TIMEOUT_MS = 2_000;

// 選択状態は font-weight でも判別する（AC）ため、bold 側の "C" は engine によっては
// 数百分の1px 単位で advance が広くなる（実測: WebKit で約0.58px、Chromium では同一）。
// ここで見たいのは「state 変化で見た目のサイズが変わらないこと」なので、
// 目視できない sub-pixel 差だけを許容する。
const MAX_SIZE_DIFFERENCE_PX = 1;

// 最後の候補の C まで keyboard だけで到達するときの Tab 上限。
// 実測（probe）でのタブ順は「header nav 9 → 戻る/追加/セクション/並べ替え/削除 7 →
// 楽曲Combobox 1」で17 stop、その後は候補1件あたり 2 stop（checkbox + C）× 18人 = 36。
// 合計53程度なので余裕を見て倍程度に取る。上限は無限ループ防止であり、到達可否そのものが
// accessibility の契約なので、狭く見積もって誤って落とすより広めに取る。
const MAX_FORWARD_TAB = FIXTURE_MEMBER_COUNT * 2 + 60;

type ToggleAppearance = {
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderRadiusPx: number;
  fontWeight: number;
  // 自分より外側の背景色（手前→奥）。border / focus ring が接する「外側の背景」を解決するために使う。
  ancestorBackgrounds: string[];
  width: number;
  height: number;
};

type FocusStyles = {
  outlineStyle: string;
  outlineWidth: string;
};

type Clearance = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

function centerToggles(page: Page): Locator {
  return page.locator(CENTER_TOGGLE_SELECTOR);
}

// 祖先の背景色スタックから実効的な背景色を求める。透明（alpha=0）は飛ばし、
// 半透明が続く場合は奥へ composite していく。ボタン自身の背景は含めない使い方もするため、
// 「どのスタックを渡すか」は呼び出し側が決める。
function resolveBackgroundStack(layers: string[], label: string): Rgba {
  let resolved: Rgba | null = null;
  for (const layer of layers) {
    const color = parseColor(layer);
    if (color.a === 0) {
      continue;
    }
    resolved = resolved === null ? color : composite(resolved, color);
    if (resolved.a >= 1) {
      return resolved;
    }
  }
  if (resolved === null) {
    throw new Error(`${label}の背景色を解決できませんでした（祖先がすべて透明です）。`);
  }
  return resolved;
}

async function readToggleAppearance(toggle: Locator): Promise<ToggleAppearance> {
  return toggle.evaluate((element) => {
    const style = getComputedStyle(element);
    const ancestorBackgrounds: string[] = [];
    for (let node = element.parentElement; node !== null; node = node.parentElement) {
      ancestorBackgrounds.push(getComputedStyle(node).backgroundColor);
    }
    const rect = element.getBoundingClientRect();
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderTopColor,
      borderRadiusPx: Number.parseFloat(style.borderTopLeftRadius),
      fontWeight: Number(style.fontWeight),
      ancestorBackgrounds,
      width: rect.width,
      height: rect.height,
    };
  });
}

async function readFocusStyles(toggle: Locator): Promise<FocusStyles> {
  return toggle.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
}

// outline-color が変化しなくなるまで rAF で待ってから値を返す（file header の #441 参照）。
// 固定 sleep ではなく「値が安定した」という実条件を待つ。
async function waitForOutlineColorSettled(toggle: Locator): Promise<string> {
  return toggle.evaluate(
    (element, timeoutMs) =>
      new Promise<string>((resolve, reject) => {
        const deadline = performance.now() + timeoutMs;
        let previous = getComputedStyle(element).outlineColor;
        let stableFrames = 0;
        const tick = (): void => {
          const current = getComputedStyle(element).outlineColor;
          stableFrames = current === previous ? stableFrames + 1 : 0;
          previous = current;
          if (stableFrames >= 3) {
            resolve(current);
            return;
          }
          if (performance.now() > deadline) {
            reject(
              new Error(
                `outline-colorが${timeoutMs}ms以内に安定しませんでした（最後の値: ${current}）`
              )
            );
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    OUTLINE_SETTLE_TIMEOUT_MS
  );
}

// clip 境界であるグリッド（.grid）の列数とスクロール状況を読む。
async function readGridLayout(toggle: Locator): Promise<{
  columnCount: number;
  scrollHeight: number;
  clientHeight: number;
}> {
  return toggle.evaluate((element) => {
    const container = element.closest(".grid");
    if (container === null) {
      throw new Error("センター切り替えを含むgrid containerが見つかりません。");
    }
    return {
      columnCount: getComputedStyle(container).gridTemplateColumns.split(" ").length,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
    };
  });
}

// focus 中の toggle と、clip 境界であるグリッド（.grid）との4辺の余白を測る。
async function readGridClearance(toggle: Locator): Promise<Clearance> {
  return toggle.evaluate((element) => {
    const container = element.closest(".grid");
    if (container === null) {
      throw new Error("センター切り替えを含むgrid containerが見つかりません。");
    }
    const button = element.getBoundingClientRect();
    const box = container.getBoundingClientRect();
    // 端までscrollした直後は 3.9999998 のような誤差が出るため小数2桁へ丸める
    const round = (value: number): number => Math.round(value * 100) / 100;
    return {
      top: round(button.top - box.top),
      right: round(box.right - button.right),
      bottom: round(box.bottom - button.bottom),
      left: round(button.left - box.left),
    };
  });
}

// 指定 index の toggle へ keyboard だけで到達する。walk 自体は共有 helper
// （contrast.ts の focusWithKeyboard）に任せ、この画面固有の事情だけを options で渡す。
//
// - maxTabs: 既定の40では先頭の C にすら届かない（実測で focus test 8/8 が到達失敗した）。
//   header nav + フォーム操作部で17 stop、その後は候補1件あたり2 stop（checkbox + C）× 18人。
// - onStep: 楽曲Combobox は onFocus で候補リストを開き、候補 <button> に tabIndex=-1 を
//   付けていないため、そのまま Tab し続けると登録曲551件すべてを通過してしまう
//   （タブ順を probe して確認）。Escape でリストを閉じてから先へ進む。
//   これは spec 側の回避策で、Combobox のタブ順そのものは #458 で直す。
//   #458 の対応後はこの onStep が不要になる可能性があるため、そのとき見直す。
async function focusToggleWithKeyboard(
  page: Page,
  toggles: Locator,
  index: number
): Promise<void> {
  try {
    await focusWithKeyboard(page, toggles.nth(index), {
      maxTabs: MAX_FORWARD_TAB,
      onStep: async () => {
        if (await page.locator('[role="combobox"]:focus').count()) {
          await page.keyboard.press("Escape");
        }
      },
    });
  } catch (cause) {
    // 共有 helper の汎用メッセージに、どの候補で失敗したかと a11y 上の意味を足す
    throw new Error(
      `${index + 1}番目のセンター切り替えへTabで到達できませんでした（Tab ${MAX_FORWARD_TAB}回）。` +
        "keyboardで到達できないのはaccessibility上の退行の可能性があります。",
      { cause }
    );
  }
}

// fixture の編集画面を開く。fixture が無い環境（remote Supabase）では false を返す。
async function openFixtureEditor(page: Page): Promise<boolean> {
  const response = await page.goto(SETLIST_EDIT_PATH);
  // fixture が無いと getLiveDetailPageData が null を返し、page.tsx の notFound() で 404 になる。
  if (response !== null && response.status() === 404) {
    return false;
  }

  await expect(
    page.getByRole("heading", { level: 1, name: "セットリストを編集" })
  ).toBeVisible();

  // fixture の前提（18人全員が披露メンバー / センターはちょうど1人）をここで固定する。
  // 中途半端な fixture のまま以降を assert すると、原因の分かりにくい失敗になるため。
  const toggles = centerToggles(page);
  await expect(toggles).toHaveCount(FIXTURE_MEMBER_COUNT);
  await expect(page.locator(`${CENTER_TOGGLE_SELECTOR}[aria-pressed="true"]`)).toHaveCount(1);
  return true;
}

// text は自分の背景に対して 4.5:1、border は「外側の隣接背景」に対して 3:1 を満たす。
// border が接するのは自分の背景ではなくグリッド側の面なので、比較相手を取り違えない。
function expectToggleContrast(appearance: ToggleAppearance, label: string): void {
  const outerBackground = resolveBackgroundStack(
    appearance.ancestorBackgrounds,
    `${label}の外側背景`
  );
  const ownBackground = resolveBackgroundStack(
    [appearance.backgroundColor, ...appearance.ancestorBackgrounds],
    `${label}の背景`
  );

  expectAaContrastColors(
    composite(parseColor(appearance.color), ownBackground),
    ownBackground,
    `${label}のラベル`
  );
  expectContrastAtLeast(
    composite(parseColor(appearance.borderColor), outerBackground),
    outerBackground,
    3,
    `${label}のborder`
  );
}

for (const theme of themes) {
  for (const viewport of viewports) {
    test(`センター切り替えの選択状態を色以外でも判別できる（${theme} ${viewport.width}px）`, async ({
      page,
    }) => {
      test.setTimeout(60_000);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme });

      const opened = await openFixtureEditor(page);
      test.skip(!opened, SKIP_REASON);

      const selectedToggle = page.locator(
        `${CENTER_TOGGLE_SELECTOR}[aria-pressed="true"]`
      );
      const unselectedToggle = page
        .locator(`${CENTER_TOGGLE_SELECTOR}[aria-pressed="false"]`)
        .first();

      const [selected, unselected] = await Promise.all([
        readToggleAppearance(selectedToggle),
        readToggleAppearance(unselectedToggle),
      ]);

      // 1. contrast（ラベル 4.5:1 / border は外側の隣接背景に対して 3:1）
      expectToggleContrast(selected, "センター選択中のC");
      expectToggleContrast(unselected, "センター未選択のC");

      // 2-a. 形: 選択中は円形（border-radius が高さの半分以上）、未選択は明確に小さい
      expect(
        selected.borderRadiusPx,
        "センター選択中のCが円形（rounded-full）ではありません"
      ).toBeGreaterThanOrEqual(selected.height / 2);
      expect(
        unselected.borderRadiusPx,
        "未選択のCのborder-radiusが選択中と区別できません"
      ).toBeLessThan(selected.borderRadiusPx);

      // 2-b. 太さ: 選択中のみ bold 相当
      expect(
        selected.fontWeight,
        "センター選択中のCがbold相当ではありません"
      ).toBeGreaterThanOrEqual(BOLD_FONT_WEIGHT);
      expect(
        unselected.fontWeight,
        "未選択のCが選択中と同じ太さです"
      ).toBeLessThan(BOLD_FONT_WEIGHT);

      // 2-c. ラベルは両状態とも厳密に "C"。部分一致だと "C済" のような退行を見逃すため
      // 完全一致の正規表現で固定する。
      await expect(selectedToggle).toHaveText(/^C$/);
      await expect(unselectedToggle).toHaveText(/^C$/);

      // 3. レイアウト安定: state が変わってもサイズが変わらない。
      // 高さは完全一致、幅は sub-pixel 差だけ許容する（MAX_SIZE_DIFFERENCE_PX のコメント参照）。
      expect(
        Math.abs(selected.height - unselected.height).toFixed(1),
        "選択状態でCの高さが変わっています"
      ).toBe("0.0");
      expect(
        Math.abs(selected.width - unselected.width),
        "選択状態でCの幅が目視できるほど変わっています"
      ).toBeLessThanOrEqual(MAX_SIZE_DIFFERENCE_PX);

      // 4. 横スクロールを発生させない（候補グリッド自身が横方向の clip 境界になるため、
      //    グリッドが広がって document を押し広げていないことを見る）
      const documentSize = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        documentSize.scrollWidth,
        `${viewport.width}pxで横スクロールが発生しています`
      ).toBeLessThanOrEqual(documentSize.clientWidth);
    });
  }
}

// focus ring の検証は「グリッドがスクロールする経路」と「しない経路」の両方で行う。
// viewport は contrast.ts の viewports から取り、列数を assert して前提を固定する
// （index がずれたら列数の assert で明示的に落ちる）。
const FOCUS_VIEWPORTS = [
  {
    // 390px: grid-cols-2 → 18人で9行となり max-h-40（160px）を超えて縦スクロールする
    viewport: viewports[1],
    expectedColumnCount: 2,
    expectsVerticalScroll: true,
  },
  {
    // 最大幅: sm:grid-cols-3 → 6行でスクロールしない。ただし行高は font metrics 依存で
    // engine 差があるため、「スクロールしない」ことまでは固定せず列数だけを前提にする。
    viewport: viewports[viewports.length - 1],
    expectedColumnCount: 3,
    expectsVerticalScroll: false,
  },
] as const;

for (const theme of themes) {
  for (const { viewport, expectedColumnCount, expectsVerticalScroll } of FOCUS_VIEWPORTS) {
    test(`センター切り替えのfocus ringが2px・3:1でグリッドに切られない（${theme} ${viewport.width}px）`, async ({
      page,
    }) => {
      // 3箇所へ Tab で到達するため、通常の spec より長めの budget を取る。
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme });

      const opened = await openFixtureEditor(page);
      test.skip(!opened, SKIP_REASON);

      const toggles = centerToggles(page);
      const layout = await readGridLayout(toggles.first());
      expect(
        layout.columnCount,
        `${viewport.width}pxの候補グリッドの列数が想定と異なります`
      ).toBe(expectedColumnCount);
      if (expectsVerticalScroll) {
        expect(
          layout.scrollHeight,
          "候補グリッドが縦スクロールしていません（fixtureの人数が変わった可能性があります）"
        ).toBeGreaterThan(layout.clientHeight);
      }

      // #441: 右端の列だけを見て clip を見逃した。先頭 / 最後 / 右端の3箇所を対象にする。
      // 右端は「初期表示での right が最大」の候補（列数が変わっても成り立つ求め方）。
      const rightEdges = await toggles.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().right)
      );
      const rightmostIndex = rightEdges.reduce(
        (best, right, index) => (right > rightEdges[best] ? index : best),
        0
      );

      const targets: { label: string; index: number }[] = [];
      for (const candidate of [
        { label: "先頭", index: 0 },
        { label: "最後", index: FIXTURE_MEMBER_COUNT - 1 },
        { label: "右端の列", index: rightmostIndex },
      ]) {
        const existing = targets.find((target) => target.index === candidate.index);
        if (existing) {
          existing.label = `${existing.label} / ${candidate.label}`;
          continue;
        }
        targets.push({ ...candidate });
      }

      for (const target of targets) {
        const toggle = toggles.nth(target.index);
        const label = `${target.label}のC`;

        await focusToggleWithKeyboard(page, toggles, target.index);

        // 遷移途中の outline-color を読まない（file header の #441 参照）
        const outlineColor = await waitForOutlineColorSettled(toggle);
        const focusStyles = await readFocusStyles(toggle);
        expect(focusStyles.outlineStyle, `${label}のoutlineStyleがnoneです`).not.toBe(
          "none"
        );
        expect(focusStyles.outlineWidth, `${label}のoutlineWidthが2pxではありません`).toBe(
          "2px"
        );

        const appearance = await readToggleAppearance(toggle);
        const outerBackground = resolveBackgroundStack(
          appearance.ancestorBackgrounds,
          `${label}の外側背景`
        );
        expectContrastAtLeast(
          composite(parseColor(outlineColor), outerBackground),
          outerBackground,
          3,
          `${label}のfocus indicator`
        );

        // clip 境界（overflow-y-auto のグリッド）との余白を4辺すべてで見る。
        // ここを1辺だけにすると #441 の見逃しがそのまま再発する。
        const clearance = await readGridClearance(toggle);
        for (const [side, value] of [
          ["上", clearance.top],
          ["右", clearance.right],
          ["下", clearance.bottom],
          ["左", clearance.left],
        ] as const) {
          expect(
            value,
            `${label}の${side}側でfocus ring（offset2px + width2px）がグリッドに切られます`
          ).toBeGreaterThanOrEqual(MIN_FOCUS_CLEARANCE_PX);
        }
      }
    });
  }
}
