import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * 管理フォームの初期表示で hydration mismatch が起きないことを固定する（#443）。
 *
 * 原因は `useAdminForm` の初期値ビルダが SSR と client hydration の両方で実行され、
 * その中で `crypto.randomUUID()` からキーを採番していたこと。キーから作る
 * `id` / `htmlFor` が食い違い、React が mismatch を報告していた。
 *
 * dev の Issue overlay ではなく production build（webServer の build + start）に対して、
 * console error と React の hydration 警告が出ないことを検証する。
 *
 * 新規画面だけでなく、既存データが入った編集画面も対象にする。編集画面は
 * `toFormValues` 経由で行数分のキーを採番するため、mismatch が起きるなら
 * こちらの方が再現しやすい。
 */

// production build では React のメッセージが minified され、
// 「Minified React error #418」のような形になる。418/419/421/423/425 は
// hydration 失敗系のコードなので、文言と併せてコード側でも検出する。
const HYDRATION_PATTERN =
  /hydrat|did not match|server rendered html|text content does not match|Minified React error #(418|419|421|423|425)/i;

type ConsoleCapture = {
  errors: string[];
  hydrationMessages: string[];
};

/**
 * リソース読み込み失敗は本Issueの対象外。favicon 等の静的アセットが未配置で、
 * 全ページに既存の 404 が出ている。hydration とは別の関心事なので、
 * ここで拾うと本来見たい React のエラーが埋もれる。
 */
function isResourceLoadFailure(text: string): boolean {
  return /failed to load resource/i.test(text);
}

function captureConsole(page: Page): ConsoleCapture {
  const capture: ConsoleCapture = { errors: [], hydrationMessages: [] };

  const record = (message: ConsoleMessage) => {
    const text = message.text();
    if (HYDRATION_PATTERN.test(text)) {
      capture.hydrationMessages.push(text);
    }
    // React の hydration 警告は error だけでなく warning でも出るため両方拾う
    if (message.type() === "error" && !isResourceLoadFailure(text)) {
      capture.errors.push(text);
    }
  };

  page.on("console", record);
  page.on("pageerror", (error) => {
    const text = error.message;
    if (!isResourceLoadFailure(text)) {
      capture.errors.push(text);
    }
    if (HYDRATION_PATTERN.test(text)) {
      capture.hydrationMessages.push(text);
    }
  });

  return capture;
}

/**
 * hard navigation で開き、hydration が終わるまで待つ。
 * SPA 遷移では SSR された HTML を経由しないため、必ず `goto` で開く。
 */
async function openAndHydrate(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

function expectNoHydrationIssue(capture: ConsoleCapture, label: string): void {
  expect(capture.hydrationMessages, `${label}: hydration mismatch`).toEqual([]);
  // リソース読み込み以外の console error（React のエラー等）も出ないこと
  expect(capture.errors, `${label}: console error`).toEqual([]);
}

const NEW_FORM_PATHS = [
  { label: "楽曲の新規作成", path: "/admin/songs/new" },
  { label: "メンバーの新規作成", path: "/admin/members/new" },
  { label: "リリースの新規作成", path: "/admin/releases/new" },
  { label: "スポットの新規作成", path: "/spots/new" },
];

for (const { label, path } of NEW_FORM_PATHS) {
  test(`${label}でhydration mismatchが発生しない`, async ({ page }) => {
    const capture = captureConsole(page);

    await openAndHydrate(page, path);

    expectNoHydrationIssue(capture, label);
  });
}

/**
 * 編集画面は一覧から辿る。E2E の対象DBに依存する固定IDを埋め込まないため。
 * 対象データが無い環境では skip する（データ有無で fail させない）。
 */
const EDIT_FORM_TARGETS = [
  { label: "楽曲の編集", listPath: "/admin/songs" },
  { label: "メンバーの編集", listPath: "/admin/members" },
  { label: "リリースの編集", listPath: "/admin/releases" },
  { label: "スポットの編集", listPath: "/spots" },
];

for (const { label, listPath } of EDIT_FORM_TARGETS) {
  test(`${label}（データ入り）でhydration mismatchが発生しない`, async ({ page }) => {
    await page.goto(listPath, { waitUntil: "networkidle" });

    const editLink = page.locator('a[href$="/edit"]').first();
    const hasTarget = (await editLink.count()) > 0;
    test.skip(!hasTarget, `${listPath} に編集可能なデータが無い`);

    const href = await editLink.getAttribute("href");
    expect(href, `${label}: 編集リンクの href`).toBeTruthy();

    // 一覧からの SPA 遷移では SSR HTML を経由しないため、URL を取って開き直す
    const capture = captureConsole(page);
    await openAndHydrate(page, href as string);

    expectNoHydrationIssue(capture, label);
  });
}

// キーから組み立てる id と label の htmlFor が SSR/CSR で一致していることを、
// 実際の DOM 上でも確認する（#443 の直接の症状）。
test("楽曲フォームの動的行のidとhtmlForが一致する", async ({ page }) => {
  const capture = captureConsole(page);

  await openAndHydrate(page, "/admin/songs/new");

  const releaseSearch = page.locator('[id^="release-search-"]').first();
  await expect(releaseSearch).toBeVisible();

  const inputId = await releaseSearch.getAttribute("id");
  expect(inputId, "release-search の id").toBeTruthy();
  // ランダムUUIDではなく決定的なキーになっていること
  expect(inputId).toMatch(/^release-search-initial-/);

  const label = page.locator(`label[for="${inputId}"]`);
  await expect(label).toHaveCount(1);

  expectNoHydrationIssue(capture, "楽曲フォームのid整合");
});
