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
  failedResources: string[];
};

/**
 * 既存の静的アセット 404（favicon 等が未配置）だけを除外する。
 *
 * 「Failed to load resource」を console テキストで一律除外すると、client JS chunk や
 * RSC の取得失敗まで無視してしまう。その場合 SSR 済みの見出しは表示されるため
 * hydration していなくてもテストが通り、回帰テストとして偽陰性になる。
 *
 * console message の location は空になることがあり URL 判定に使えないため、
 * response を直接監視して URL で判定する。
 */
/**
 * Vercel Analytics / Speed Insights のスクリプトは Vercel 上でのみ配信され、
 * ローカルの `next start` では必ず 404 になる。アプリの配信物ではないため除外する。
 * `/_next/` 配下の chunk や RSC は除外しないので、hydration に必要な取得の
 * 失敗はそのまま検出できる。
 */
const IGNORABLE_RESOURCE_URL =
  /\/_vercel\/|(favicon|apple-touch-icon|icon)[^/]*\.(ico|png|svg)$/i;

/** console 側の「Failed to load resource」は response 監視と重複するので数えない */
function isResourceLoadMessage(text: string): boolean {
  return /failed to load resource/i.test(text);
}

function captureConsole(page: Page): ConsoleCapture {
  const capture: ConsoleCapture = {
    errors: [],
    hydrationMessages: [],
    failedResources: [],
  };

  const record = (message: ConsoleMessage) => {
    const text = message.text();
    if (HYDRATION_PATTERN.test(text)) {
      capture.hydrationMessages.push(text);
    }
    // React の hydration 警告は error だけでなく warning でも出るため両方拾う
    if (message.type() === "error" && !isResourceLoadMessage(text)) {
      capture.errors.push(text);
    }
  };

  page.on("console", record);
  // 未捕捉例外はリソース取得の失敗ではないので、常に error として扱う
  page.on("pageerror", (error) => {
    capture.errors.push(error.message);
    if (HYDRATION_PATTERN.test(error.message)) {
      capture.hydrationMessages.push(error.message);
    }
  });

  // 取得に失敗したリソースは URL で判定する。既知の静的アセット以外が落ちていれば、
  // hydration に必要な chunk / RSC が届いていない可能性がある。
  page.on("response", (response) => {
    if (response.ok() || response.status() < 400) return;
    const url = response.url();
    if (IGNORABLE_RESOURCE_URL.test(url)) return;
    capture.failedResources.push(`${response.status()} ${url}`);
  });

  return capture;
}

/**
 * hard navigation で開き、hydration が終わるまで待つ。
 * SPA 遷移では SSR された HTML を経由しないため、必ず `goto` で開く。
 *
 * 見出しの表示は SSR 済み HTML でも満たされるため、hydration 完了の根拠にならない。
 * クライアント state を更新するボタン（行の追加）を押し、DOM が増えることまで
 * 確認する。JS が動いていなければここで落ちる。
 */
async function openAndHydrate(
  page: Page,
  path: string,
  addRowLabel: string
): Promise<void> {
  await page.goto(path, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // MemberForm のように同名の追加ボタンが複数ある画面があるため先頭に絞る
  const addButton = page.getByRole("button", { name: addRowLabel }).first();
  await expect(addButton).toBeVisible();

  const rowSelector = "form input, form select, form textarea";
  const before = await page.locator(rowSelector).count();
  await addButton.click();
  await expect
    .poll(() => page.locator(rowSelector).count(), {
      message: `${path}: 行追加で入力要素が増えない（hydration していない可能性）`,
    })
    .toBeGreaterThan(before);
}

function expectNoHydrationIssue(capture: ConsoleCapture, label: string): void {
  expect(capture.hydrationMessages, `${label}: hydration mismatch`).toEqual([]);
  // リソース読み込み以外の console error（React のエラー等）も出ないこと
  expect(capture.errors, `${label}: console error`).toEqual([]);
  // 既知の静的アセット以外の取得失敗（chunk / RSC 等）も出ないこと
  expect(capture.failedResources, `${label}: リソース取得失敗`).toEqual([]);
}

const NEW_FORM_PATHS = [
  { label: "楽曲の新規作成", path: "/admin/songs/new", addRowLabel: "+ リリースを追加" },
  { label: "メンバーの新規作成", path: "/admin/members/new", addRowLabel: "+ 追加" },
  { label: "リリースの新規作成", path: "/admin/releases/new", addRowLabel: "+ 楽曲を追加" },
  { label: "スポットの新規作成", path: "/spots/new", addRowLabel: "出来事を追加" },
];

for (const { label, path, addRowLabel } of NEW_FORM_PATHS) {
  test(`${label}でhydration mismatchが発生しない`, async ({ page }) => {
    const capture = captureConsole(page);

    await openAndHydrate(page, path, addRowLabel);

    expectNoHydrationIssue(capture, label);
  });
}

/**
 * 編集画面は一覧から辿る。E2E の対象DBに依存する固定IDを埋め込まないため。
 * 対象データが無い環境では skip する（データ有無で fail させない）。
 */
const EDIT_FORM_TARGETS = [
  { label: "楽曲の編集", listPath: "/admin/songs", addRowLabel: "+ リリースを追加" },
  { label: "メンバーの編集", listPath: "/admin/members", addRowLabel: "+ 追加" },
  { label: "リリースの編集", listPath: "/admin/releases", addRowLabel: "+ 楽曲を追加" },
  { label: "スポットの編集", listPath: "/spots", addRowLabel: "出来事を追加" },
];

for (const { label, listPath, addRowLabel } of EDIT_FORM_TARGETS) {
  test(`${label}（データ入り）でhydration mismatchが発生しない`, async ({ page }) => {
    await page.goto(listPath, { waitUntil: "networkidle" });

    const editLink = page.locator('a[href$="/edit"]').first();
    const hasTarget = (await editLink.count()) > 0;
    test.skip(!hasTarget, `${listPath} に編集可能なデータが無い`);

    const href = await editLink.getAttribute("href");
    expect(href, `${label}: 編集リンクの href`).toBeTruthy();

    // 一覧からの SPA 遷移では SSR HTML を経由しないため、URL を取って開き直す
    const capture = captureConsole(page);
    await openAndHydrate(page, href as string, addRowLabel);

    expectNoHydrationIssue(capture, label);
  });
}

// キーから組み立てる id と label の htmlFor が SSR/CSR で一致していることを、
// 実際の DOM 上でも確認する（#443 の直接の症状）。
test("楽曲フォームの動的行のidとhtmlForが一致する", async ({ page }) => {
  const capture = captureConsole(page);

  await openAndHydrate(page, "/admin/songs/new", "+ リリースを追加");

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
