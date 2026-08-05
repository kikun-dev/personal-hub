import { expect, test, type Locator, type Page } from "@playwright/test";
import { composite, expectContrastAtLeast, parseColor, themes, viewports, type Rgba } from "./contrast";

// #484 / GF-SAKA-003 の回帰テスト。
//
// センター文字（`★`）の色は raw palette（`text-amber-600` 等）から
// semantic token `--center-text`（light `#8a5a00` / dark `#d4af37`、
// `text-center-text` class 経由）へ移行した（components/ui/FormationRows.tsx、
// components/members/MemberSongsSection.tsx）。unit test
// （components/ui/centerTextToken.test.ts）は token の定義値そのものを
// 固定するが、実際の画面で **computed text color と実際に隣接する背景**の
// contrast が 4.5:1 を割らないことまでは検証しない。本 spec はそれを
// ローカル Supabase の E2E fixture（041/043/044）上で固定する。
//
// 対象は3面: Member detail（`★ センター N曲` と展開後のセンター曲 `★`）/
// Song detail（`FormationRows`）/ Setlist detail（`FormationRows`）。
// `Card` は `bg-background`、Setlist 側の枠はページ背景をそのまま透過して
// 使う（components/lives/SetlistFormationDisplay.tsx は自身に `bg-*` を
// 持たない）ため、面ごとに背景の持ち主が違う。よって固定色文字列を
// 決め打ちで渡さず、DOM を遡って実際に不透明な背景を持つ祖先の
// `backgroundColor` を都度解決する（resolveNearestOpaqueBackground）。
//
// データが無い環境（seed 未投入・curated data 運用中で fixture が
// skip された環境）では無言で skip せず、`expect(...).toBeVisible()` で
// 明示的に fail させる（setlist-center-toggle.spec.ts の 404-skip とは
// 意図的に異なる方針。#484 の指示に基づく）。
//
// ただし3面すべてが seed 041（ライブ・演目）/ 043（合成メンバー・所属・
// 参加楽曲）/ 044（song / setlist 双方の formation）のfixtureに依存してお
// り、remote には対応する curated data が無い。そのため既定の
// `pnpm test:e2e`（remote Supabase）では、上記の明示 fail 方針の対象外
// として `test.skip` する（setlist-center-toggle.spec.ts と同じ既存慣行。
// 判定は `E2E_LOCAL_SUPABASE` env で行う。playwright/local-run.mjs が
// spawn する playwright プロセスにのみこの env を渡す）。
//
// theme × viewport の全組み合わせ（2 × 3）を3面すべてで回すと重いため、
// contrast/太字検証は light/dark × 390px/1440px（320px は除外）、
// horizontal overflow は light のみで確認する。overflow は viewport 幅に
// 依存するテーマ非依存の性質のため theme を絞ってもリスクは小さく、
// contrast は色変数が theme で変わるため両テーマを見る必要がある。

const BOLD_FONT_WEIGHT_THRESHOLD = 600; // font-medium(500) と font-bold(700) の境界（setlist-center-toggle.spec.ts と同じ閾値）

// 3面すべてが seed 041 / 043 / 044 を投入したローカル Supabase専用のfixtureです。
// remote 実行を fail させず、意図した skip として扱う（playwright/README.md の既存慣行。
// setlist-center-toggle.spec.ts と同じ方針）。
const SKIP_REASON =
  "seed 041（ライブ・演目）/ 043（合成メンバー・所属・参加楽曲）/ 044（formation）を" +
  "投入したローカルSupabase専用のfixtureです。" +
  "`pnpm --filter oshikatsu-web test:e2e:local -- playwright/center-text-contrast.spec.ts` で実行してください。";

const contrastViewports = viewports.filter(
  (viewport) => viewport.width === 390 || viewport.width === 1440
);
if (contrastViewports.length !== 2) {
  throw new Error("contrast.ts の viewports に 390px / 1440px が定義されていません。");
}

// ------------------------------------------------------------
// 一覧から detail href を解決するヘルパー。
// interaction-contract.spec.ts の resolveFirstDetailHref / showAllMembers と
// 同じ方針（固定 ID に依存しない）。spec 間の結合を避けるため export はせず、
// 同等の実装をこの spec 内に持つ（元の実装が変わったらここも見直すこと）。
// ------------------------------------------------------------

async function showAllMembers(page: Page): Promise<void> {
  await page
    .getByRole("combobox", { name: "在籍状況で絞り込み" })
    .selectOption({ label: "全員" });
}

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

async function resolveMemberHref(page: Page): Promise<string> {
  // 043 は合成メンバー01にのみ orbit_member_groups を投入する。memberRepository の
  // 一覧クエリは所属を inner join するため、一覧に現れるのはこのメンバーだけになる
  // （supabase/seeds/043_seed_e2e_member_interaction_fixture.sql 参照）。
  return resolveFirstDetailHref(page, "/members", "/members/", showAllMembers);
}

async function expandMemberSongsSection(page: Page): Promise<void> {
  const collapsedButton = page.getByRole("button", { name: "全曲を表示 ▼" });
  await expect(
    collapsedButton,
    "MemberSongsSectionのdisclosure buttonが見つかりません" +
      "（参加楽曲を持つメンバーが一覧の先頭にいない可能性があります）"
  ).toBeVisible();

  // 展開するとaccessible nameが「閉じる ▲」へ変わるため、nameベースのlocatorでは
  // 展開後の状態を追跡できない（interaction-contract.spec.ts と同じ理由）。
  // 開閉で変わらないaria-controlsで同じbuttonを指し続ける。
  const controlsId = await collapsedButton.getAttribute("aria-controls");
  if (controlsId === null) {
    throw new Error("MemberSongsSectionのdisclosure buttonにaria-controlsがありませんでした。");
  }

  await collapsedButton.click();
  const button = page.locator(`button[aria-controls="${controlsId}"]`);
  await expect(button).toHaveAttribute("aria-expanded", "true");
}

// Song detail のfixtureは 043 がセンターに設定した track と同じ曲（044 の formation）を
// 対象にする。固定 track ID を書かず、Member detail の展開後リストで
// `span.text-center-text`（★ マーカー）を持つ song リンクの href を辿って解決する。
async function resolveCenterSongHref(page: Page): Promise<string> {
  const memberHref = await resolveMemberHref(page);
  await page.goto(memberHref);
  await expandMemberSongsSection(page);

  const link = page
    .locator('a[href^="/songs/"]')
    .filter({ has: page.locator("span.text-center-text") })
    .first();
  await expect(
    link,
    "Member detail の展開後songリストにセンター曲（span.text-center-text）へのlinkが" +
      "見つかりません（044のformation fixtureが投入されていない可能性があります）"
  ).toBeVisible();
  const href = await link.getAttribute("href");
  if (href === null) {
    throw new Error("センター曲songリンクにhrefがありませんでした。");
  }
  return href;
}

// 041 が投入するライブ名（supabase/seeds/041_seed_e2e_setlist_member_fixture.sql の
// c_live_name）。固定IDではなく一覧に表示される名前でhrefを解決する
// （playwright/live-detail-attendance-density.spec.ts の resolveFallbackLiveHref と同じ方針）。
const FIXTURE_LIVE_NAME = "【E2E】センター切り替え検証";

async function resolveSetlistHref(page: Page): Promise<string> {
  await page.goto("/lives");
  const liveLink = page.getByRole("link", { name: FIXTURE_LIVE_NAME }).first();
  await expect(
    liveLink,
    `ライブ一覧に「${FIXTURE_LIVE_NAME}」へのlinkが見つかりません` +
      "（seed 041が投入されていない可能性があります）"
  ).toBeVisible();
  const liveHref = await liveLink.getAttribute("href");
  if (liveHref === null) {
    throw new Error("ライブ詳細へのhrefが取得できませんでした。");
  }

  await page.goto(liveHref);
  const setlistLink = page.getByRole("link", { name: "詳細を見る →" }).first();
  await expect(
    setlistLink,
    "ライブ詳細にセットリスト詳細（「詳細を見る →」）へのlinkが見つかりません"
  ).toBeVisible();
  const setlistHref = await setlistLink.getAttribute("href");
  if (setlistHref === null) {
    throw new Error("セットリスト詳細へのhrefが取得できませんでした。");
  }
  return setlistHref;
}

// ------------------------------------------------------------
// 実際に不透明な背景を持つ祖先の backgroundColor を解決する。
// playwright/setlist-center-toggle.spec.ts の resolveBackgroundStack /
// readToggleAppearance と同じロジック（祖先を手前から奥へ辿り、透明は
// 飛ばし、半透明は奥へ composite する。最後に :root の --background を
// 必ず積むことで、報告が壊れるケース（#465）でも解決不能にならない）。
// このspec専用の対象（p.text-center-text / span.text-center-text）に絞って
// 使うため、setlist-center-toggle.spec.ts からは import せずローカルに持つ。
// ------------------------------------------------------------

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
    throw new Error(
      `${label}の背景色を解決できませんでした（祖先がすべて透明です）。layers=${JSON.stringify(layers)}`
    );
  }
  return resolved;
}

async function resolveNearestOpaqueBackground(locator: Locator, label: string): Promise<Rgba> {
  const layers = await locator.evaluate((element) => {
    const collected: string[] = [];
    for (let node = element.parentElement; node !== null; node = node.parentElement) {
      collected.push(getComputedStyle(node).backgroundColor);
    }
    const themeBackground = getComputedStyle(document.documentElement)
      .getPropertyValue("--background")
      .trim();
    if (themeBackground !== "") {
      collected.push(themeBackground);
    }
    return collected;
  });
  return resolveBackgroundStack(layers, label);
}

async function readCenterTextStyles(
  locator: Locator
): Promise<{ color: string; fontWeight: number }> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, fontWeight: Number(style.fontWeight) };
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const overflowing = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflowing, `${label} でhorizontal overflowが発生しています`).toBe(false);
}

type CenterTarget = {
  label: string;
  locator: (page: Page) => Locator;
  // FormationRows は font-bold、MemberSongsSection のセンター表示は font-medium（#484指示）
  boldExpectation: "bold" | "medium";
};

type Face = {
  label: string;
  resolveHref: (page: Page) => Promise<string>;
  afterGoto?: (page: Page) => Promise<void>;
  targets: CenterTarget[];
};

const faces: Face[] = [
  {
    label: "Member detail",
    resolveHref: resolveMemberHref,
    afterGoto: expandMemberSongsSection,
    targets: [
      {
        label: "Member detail の「★ センター N曲」summary",
        // MemberSongsSection.tsx:70 — text-center-text は<p>自身に付く
        locator: (page) => page.locator("p.text-center-text").first(),
        boldExpectation: "medium",
      },
      {
        label: "Member detail 展開後のセンター曲 ★",
        // MemberSongsSection.tsx:110 — text-center-text は<span>に付く
        locator: (page) => page.locator("span.text-center-text").first(),
        boldExpectation: "medium",
      },
    ],
  },
  {
    label: "Song detail",
    resolveHref: resolveCenterSongHref,
    targets: [
      {
        label: "Song detail の FormationRows センター名",
        // FormationRows.tsx:58 — font-bold text-center-text
        locator: (page) => page.locator("span.text-center-text").first(),
        boldExpectation: "bold",
      },
    ],
  },
  {
    label: "Setlist detail",
    resolveHref: resolveSetlistHref,
    targets: [
      {
        label: "Setlist detail の FormationRows センター名",
        // FormationRows.tsx:58 — font-bold text-center-text（sizeがxsになるだけで同じclass）
        locator: (page) => page.locator("span.text-center-text").first(),
        boldExpectation: "bold",
      },
    ],
  },
];

for (const face of faces) {
  for (const theme of themes) {
    for (const viewport of contrastViewports) {
      test(`${face.label}: センター文字のcontrastが4.5:1以上・太字維持（${theme} ${viewport.width}px）`, async ({
        page,
      }) => {
        test.skip(process.env.E2E_LOCAL_SUPABASE !== "1", SKIP_REASON);

        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme: theme });

        const href = await face.resolveHref(page);
        await page.goto(href);
        if (face.afterGoto) {
          await face.afterGoto(page);
        }

        for (const target of face.targets) {
          const locator = target.locator(page);
          await expect(locator, `${target.label} が見つかりません`).toBeVisible();
          await expect(locator, `${target.label} に★が含まれていません`).toContainText("★");

          const { color, fontWeight } = await readCenterTextStyles(locator);
          const background = await resolveNearestOpaqueBackground(locator, target.label);
          const foreground = composite(parseColor(color), background);
          expectContrastAtLeast(foreground, background, 4.5, target.label);

          if (target.boldExpectation === "bold") {
            expect(
              fontWeight,
              `${target.label} が太字（font-bold）ではありません（実測fontWeight=${fontWeight}）`
            ).toBeGreaterThanOrEqual(BOLD_FONT_WEIGHT_THRESHOLD);
          } else {
            expect(
              fontWeight,
              `${target.label} がfont-mediumの太さではありません（実測fontWeight=${fontWeight}）`
            ).toBeLessThan(BOLD_FONT_WEIGHT_THRESHOLD);
          }
        }

        // overflowはtheme非依存の性質のため、light側でのみ確認する（file header参照）。
        if (theme === "light") {
          await expectNoHorizontalOverflow(page, `${face.label} (${viewport.width}px)`);
        }
      });
    }
  }
}
