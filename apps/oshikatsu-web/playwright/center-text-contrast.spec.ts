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
// ローカル/hosted 両方の実データ上で実測する。
//
// 対象は3面: Member detail（`★ センター N曲` と展開後のセンター曲 `★`）/
// Song detail（`FormationRows`）/ Setlist detail（`FormationRows`）。
// `Card` は `bg-background`、Setlist 側の枠はページ背景をそのまま透過して
// 使う（components/lives/SetlistFormationDisplay.tsx は自身に `bg-*` を
// 持たない）ため、面ごとに背景の持ち主が違う。よって固定色文字列を
// 決め打ちで渡さず、DOM を遡って実際に不透明な背景を持つ祖先の
// `backgroundColor` を都度解決する（resolveNearestOpaqueBackground）。
//
// データが無い環境では無言で skip せず、`expect(...).toBeVisible()` や
// 明示的な `throw` で fail させる（setlist-center-toggle.spec.ts の
// 404-skip とは意図的に異なる方針。#484 の指示に基づく）。
//
// Member face / Song face は固定 ID・固定名に依存せず「走査」で対象を
// 解決する。`/members` を在籍状況「全員」に絞った一覧の先頭から最大25件の
// detail を開き、`p.text-center-text`（★ センター N曲）を持つ最初の
// メンバーを対象にする。ローカルは043 fixtureが合成メンバー1人しか
// 一覧に出さないため1件目で当たり、hostedも数件で当たる（実測済み）。
// Song face はその同じメンバーの detail で参加楽曲を展開し、
// `span.text-center-text` を含む楽曲（=センター曲）のリンクを対象にする。
// 25件走査しても見つからなければ明示的に fail する。
//
// Setlist face だけは環境で分岐する。ローカルは seed 041
// （supabase/seeds/041_seed_e2e_setlist_member_fixture.sql）の固定ライブ名で
// 解決する。hosted は formation を持つライブが希少（実測: /lives 先頭8ライブ
// 中1件のみ）で走査が非現実的なため、実測で確認済みの固定ライブ名
// 「Sakurazaka46 ARENA TOUR 2026 -What's lonesome?-」から解決する
// （固定ライブ名のハードコードは playwright/form-focus-ring.spec.ts の
// `fallbackLiveName` と同じ既存前例に沿う）。どちらも見つからなければ
// 明示的に fail し、hosted のデータが変わった場合はアンカーの更新が
// 必要である旨をメッセージに含める。
//
// theme × viewport の全組み合わせ（2 × 3）を3面すべてで回すと重いため、
// contrast/太字検証は light/dark × 390px/1440px（320px は除外）、
// horizontal overflow は light のみで確認する。overflow は viewport 幅に
// 依存するテーマ非依存の性質のため theme を絞ってもリスクは小さく、
// contrast は色変数が theme で変わるため両テーマを見る必要がある。

const BOLD_FONT_WEIGHT_THRESHOLD = 600; // font-medium(500) と font-bold(700) の境界（setlist-center-toggle.spec.ts と同じ閾値）

const contrastViewports = viewports.filter(
  (viewport) => viewport.width === 390 || viewport.width === 1440
);
if (contrastViewports.length !== 2) {
  throw new Error("contrast.ts の viewports に 390px / 1440px が定義されていません。");
}

// ------------------------------------------------------------
// Member face / Song face: 固定 ID に依存せず「走査」で対象を解決する。
// ------------------------------------------------------------

const MAX_MEMBER_SCAN_COUNT = 25;

async function showAllMembers(page: Page): Promise<void> {
  await page
    .getByRole("combobox", { name: "在籍状況で絞り込み" })
    .selectOption({ label: "全員" });
}

// `/members` の一覧先頭から最大 MAX_MEMBER_SCAN_COUNT 件の detail を開き、
// `p.text-center-text`（★ センター N曲）を持つ最初のメンバーの href を返す。
// 見つからなければ明示的に fail する（無言 skip はしない方針）。
async function scanForCenterMemberHref(page: Page): Promise<string> {
  await page.goto("/members");
  await showAllMembers(page);

  // 先にhrefを全件集めてから遷移する。ページ内で1件ずつ goto すると
  // 一覧のDOMが失われ、以降の nth() が別ページに対して評価されてしまう。
  const links = page.locator('a[href^="/members/"]');
  const totalCount = await links.count();
  const scanCount = Math.min(totalCount, MAX_MEMBER_SCAN_COUNT);
  const hrefs: string[] = [];
  for (let index = 0; index < scanCount; index += 1) {
    const href = await links.nth(index).getAttribute("href");
    if (href !== null) {
      hrefs.push(href);
    }
  }

  for (const href of hrefs) {
    await page.goto(href);
    const summary = page.locator("p.text-center-text").first();
    if ((await summary.count()) > 0) {
      return href;
    }
  }

  throw new Error(
    `/members 一覧の先頭${MAX_MEMBER_SCAN_COUNT}件に、センター曲を持つメンバー` +
      "（p.text-center-text）が見つかりませんでした。" +
      "ローカルはseed 043（合成メンバー）が投入されていない、hostedはデータが" +
      "変わった可能性があります。必要なら走査件数（MAX_MEMBER_SCAN_COUNT）の見直しを検討してください。"
  );
}

// この spec は face(3) × theme(2) × viewport(2) = 12 test を Member face だけで
// 生成するわけではないが、全体で計24 test を playwright.config.ts の
// `workers: 1` の下で同一 worker 内に直列実行する。走査（最大25件の
// detail ページ遷移を伴う）を毎 test 都度行うと極端に遅くなるため、
// 走査結果の Promise を module スコープにキャッシュし、最初に呼ばれた
// test でのみ走査して以降の test は同じ Promise を再利用する。
let cachedCenterMemberHrefPromise: Promise<string> | null = null;

function resolveMemberHref(page: Page): Promise<string> {
  if (cachedCenterMemberHrefPromise === null) {
    cachedCenterMemberHrefPromise = scanForCenterMemberHref(page);
  }
  return cachedCenterMemberHrefPromise;
}

async function expandMemberSongsSection(page: Page): Promise<void> {
  const collapsedButton = page.getByRole("button", { name: "全曲を表示 ▼" });
  await expect(
    collapsedButton,
    "MemberSongsSectionのdisclosure buttonが見つかりません" +
      "（参加楽曲を持つメンバーが走査で解決した対象になっていない可能性があります）"
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

// Song detail の対象は、走査で解決したセンターメンバー（resolveMemberHref）と
// 同じメンバーの detail から辿る。参加楽曲を展開し、`span.text-center-text`
// （★ マーカー）を持つ song リンクの href を対象にする。
async function scanForCenterSongHref(page: Page): Promise<string> {
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
      "見つかりません（走査で解決したメンバーに参加楽曲のformationが投入されていない可能性があります）"
  ).toBeVisible();
  const href = await link.getAttribute("href");
  if (href === null) {
    throw new Error("センター曲songリンクにhrefがありませんでした。");
  }
  return href;
}

// resolveMemberHref と同じ理由でキャッシュする（Song face は Member face の
// 走査結果に依存するため、キャッシュしないと Member face 分の走査コストが
// Song face の test でも毎回発生してしまう）。
let cachedCenterSongHrefPromise: Promise<string> | null = null;

function resolveCenterSongHref(page: Page): Promise<string> {
  if (cachedCenterSongHrefPromise === null) {
    cachedCenterSongHrefPromise = scanForCenterSongHref(page);
  }
  return cachedCenterSongHrefPromise;
}

// ------------------------------------------------------------
// Setlist face: formation を持つライブが hosted では希少なため、
// Member/Song のような走査ではなく環境ごとに固定アンカーで解決する。
// ------------------------------------------------------------

// seed 041（supabase/seeds/041_seed_e2e_setlist_member_fixture.sql）が投入する
// ライブ名（c_live_name）。ローカル Supabase 専用。
const LOCAL_FIXTURE_LIVE_NAME = "【E2E】センター切り替え検証";

// hosted実測（#484）: `/lives` 先頭8ライブのうち formation を持つのはこの
// ライブのみ（3公演すべてに10〜13件のformationカードとspan.text-center-textが
// ある）。固定ライブ名のハードコードは playwright/form-focus-ring.spec.ts の
// `fallbackLiveName` と同じ既存前例に沿う。hostedのデータが変わってこの
// ライブがformationを持たなくなった場合は、このアンカーを更新すること。
const HOSTED_FIXTURE_LIVE_NAME = "Sakurazaka46 ARENA TOUR 2026 -What's lonesome?-";

async function resolveLocalSetlistHref(page: Page): Promise<string> {
  await page.goto("/lives");
  const liveLink = page.getByRole("link", { name: LOCAL_FIXTURE_LIVE_NAME }).first();
  await expect(
    liveLink,
    `ライブ一覧に「${LOCAL_FIXTURE_LIVE_NAME}」へのlinkが見つかりません` +
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

// HOSTED_FIXTURE_LIVE_NAME のライブは複数公演を持つ。formation の有無は
// 公演ごとに決まるため、「詳細を見る →」を先頭から順に開き、
// span.text-center-text を持つ最初のセットリストを対象にする
// （実測では3公演すべてに存在するが、データ変化に備えて走査する）。
async function resolveHostedSetlistHref(page: Page): Promise<string> {
  await page.goto("/lives");
  const liveLink = page.getByRole("link", { name: HOSTED_FIXTURE_LIVE_NAME }).first();
  await expect(
    liveLink,
    `ライブ一覧に「${HOSTED_FIXTURE_LIVE_NAME}」へのlinkが見つかりません。` +
      "hostedのデータが変わった場合はこのアンカーを更新すること。"
  ).toBeVisible();
  const liveHref = await liveLink.getAttribute("href");
  if (liveHref === null) {
    throw new Error("hosted用ライブ詳細へのhrefが取得できませんでした。");
  }

  await page.goto(liveHref);
  const setlistLinks = page.getByRole("link", { name: "詳細を見る →" });
  const setlistCount = await setlistLinks.count();
  const setlistHrefs: string[] = [];
  for (let index = 0; index < setlistCount; index += 1) {
    const href = await setlistLinks.nth(index).getAttribute("href");
    if (href !== null) {
      setlistHrefs.push(href);
    }
  }

  for (const href of setlistHrefs) {
    await page.goto(href);
    if ((await page.locator("span.text-center-text").count()) > 0) {
      return href;
    }
  }

  throw new Error(
    `「${HOSTED_FIXTURE_LIVE_NAME}」の公演セットリストにspan.text-center-textを持つものが` +
      "見つかりませんでした。hostedのデータが変わった場合はこのアンカーを更新すること。"
  );
}

// Setlist faceの test（theme × viewport = 4件）で毎回 /lives からの解決を
// 繰り返さないよう、Member/Song faceと同じ理由でキャッシュする。
let cachedSetlistHrefPromise: Promise<string> | null = null;

function resolveSetlistHref(page: Page): Promise<string> {
  if (cachedSetlistHrefPromise === null) {
    cachedSetlistHrefPromise =
      process.env.E2E_LOCAL_SUPABASE === "1"
        ? resolveLocalSetlistHref(page)
        : resolveHostedSetlistHref(page);
  }
  return cachedSetlistHrefPromise;
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
