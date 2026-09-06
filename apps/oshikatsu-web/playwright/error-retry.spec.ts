import { test as base, expect, type Request } from "@playwright/test";
import { fork } from "node:child_process";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { focusWithKeyboard } from "./contrast";
import { installTrackedRoute } from "./trackedRoute";

type Ids = { song: string; live: string; performance: string };
type Fault = { ids: Ids; command: (command: string) => Promise<unknown> };
const test = base.extend<{ fault: Fault }>({
  fault: [async ({}, runTest, testInfo) => {
    if (testInfo.config.workers !== 1) throw new Error("DB fault tests require workers: 1.");
    const child = fork(join(__dirname, "errorRetryDb.mjs"), { stdio: ["ignore", "inherit", "inherit", "ipc"] });
    let nextCommandId = 0;
    const command = (command: string): Promise<unknown> => new Promise((resolve, reject) => {
      if (!child.connected || child.exitCode !== null || child.signalCode !== null) {
        reject(new Error("Fault owner is no longer available"));
        return;
      }
      const id = nextCommandId++;
      const onExit = () => { child.off("message", onMessage); reject(new Error("Fault owner exited")); };
      const onMessage = (message: { id: number; error?: string; result?: unknown }) => {
        // Timeout teardown may enqueue dispose while an injection is still in
        // flight. Never mistake that earlier acknowledgement for cleanup.
        if (message.id !== id) return;
        child.off("message", onMessage);
        child.off("exit", onExit);
        if (message.error) reject(new Error(message.error));
        else resolve(message.result);
      };
      child.once("exit", onExit);
      child.on("message", onMessage);
      child.send({ command, id }, (error) => {
        if (!error) return;
        child.off("message", onMessage);
        child.off("exit", onExit);
        reject(error);
      });
    });
    try {
      const ids = await command("prepare") as Ids;
      await runTest({ ids, command });
    } finally {
      // Playwright gives fixture teardown a separate timeout budget, even when
      // the test body times out. Worker death also triggers child disconnect.
      try {
        const cleanup = await command("dispose");
        const cleanupPath = testInfo.outputPath("db-cleanup.json");
        await writeFile(cleanupPath, JSON.stringify(cleanup, null, 2));
        await testInfo.attach("db-cleanup", { path: cleanupPath, contentType: "application/json" });
      } finally {
        if (child.connected) child.disconnect();
      }
    }
  }, { timeout: 30_000 }],
});

test.skip(process.env.E2E_LOCAL_SUPABASE !== "1", "Permission faults are local-only");

for (const target of ["Song", "Live", "Setlist"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`${target} retry / re-failure / recovery (${theme})`, async ({ page, fault }, testInfo) => {
      await page.setViewportSize(testInfo.project.name === "mobile"
        ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      await page.emulateMedia({ colorScheme: theme });
      const path = target === "Song" ? `/songs/${fault.ids.song}`
        : target === "Live" ? `/lives/${fault.ids.live}`
        : `/lives/${fault.ids.live}/performances/${fault.ids.performance}/setlist`;
      await fault.command(target === "Song" ? "fail-song" : "fail-live");
      await page.goto(path);
      const retry = page.getByRole("button", { name: "再試行", exact: true });
      await expect(retry).toBeVisible();
      const errorHeading = target === "Song" ? "楽曲を表示できません" : "ライブを表示できません";
      await expect(page.getByRole("heading", { level: 1, name: errorHeading })).toHaveCount(1);
      const alert = page.getByRole("main").getByRole("alert");
      await expect(alert.getByRole("button")).toHaveCount(0);
      await expect(alert.getByRole("link")).toHaveCount(0);
      await expect(page.getByRole("main")).not.toContainText(/RepositoryError|PostgREST|permission denied|digest/);
      await expect(page.getByRole("link", { name: target === "Song" ? "← 楽曲一覧" : "← ライブ一覧", exact: true }))
        .toHaveAttribute("href", target === "Song" ? "/songs" : "/lives");
      const marker = randomUUID();
      await page.evaluate((value) => { document.documentElement.dataset.retryDocument = value; }, marker);
      const requests: { rsc: boolean; document: boolean; path: string }[] = [];
      const isRsc = (request: Request): boolean => request.headers()["rsc"] === "1" && new URL(request.url()).pathname === path;
      page.on("request", (request) => {
        if (isRsc(request) || request.isNavigationRequest()) requests.push({
          rsc: isRsc(request), document: request.isNavigationRequest(), path: new URL(request.url()).pathname,
        });
      });
      const cycles: { recovered: boolean; rscRequests: number; documentRequests: number; pendingDisabled: boolean }[] = [];
      let targetHeight = 0;
      let outlineWidth = "";
      const expectNoOverflow = async (): Promise<void> => {
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      };

      // First retry still fails; second retry follows actual dependency recovery.
      for (const shouldRecover of [false, true]) {
        if (shouldRecover) await fault.command("restore");
        let release: () => void = () => {};
        const gate = new Promise<void>((resolve) => { release = resolve; });
        const disposeRoute = await installTrackedRoute(page, "**/*", async (route) => {
          if (isRsc(route.request())) await gate;
          await route.continue();
        });
        const before = requests.length;
        try {
          await focusWithKeyboard(page, retry);
          targetHeight = await retry.evaluate((element) => element.getBoundingClientRect().height);
          outlineWidth = await retry.evaluate((element) => getComputedStyle(element).outlineWidth);
          expect(targetHeight).toBeGreaterThanOrEqual(44);
          expect(outlineWidth).toBe("2px");
          await expectNoOverflow();
          await page.screenshot({ path: testInfo.outputPath(shouldRecover ? "refailed.png" : "error-focus.png") });
          await page.keyboard.press("Enter");
          await expect.poll(() => requests.slice(before).filter((request) => request.rsc).length,
            { message: "Retry must initiate a fresh RSC request" }).toBe(1);
          const pending = page.getByRole("button", { name: "再試行中…", exact: true });
          await expect(pending).toBeDisabled();
          await expect(pending).toHaveAttribute("aria-busy", "true");
          await expectNoOverflow();
          await page.screenshot({ path: testInfo.outputPath(shouldRecover ? "recovery-pending.png" : "retry-pending.png") });
          // Native mouse and keyboard attempts while the real RSC request is held.
          const box = await pending.boundingBox();
          if (!box) throw new Error("Missing pending target");
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await page.keyboard.press("Enter");
          await page.keyboard.press("Space");
          expect(requests.slice(before).filter((request) => request.rsc)).toHaveLength(1);
          const response = page.waitForResponse((response) => isRsc(response.request()));
          release();
          await response;
          if (shouldRecover) {
            await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
            await expect(page.getByRole("heading", { level: 1 })).toContainText(target === "Song" ? "E2E Retry Song" : target === "Live" ? "E2E Retry Live" : "セットリスト");
            if (target === "Setlist") await expect(page.getByRole("link", { name: "E2E Retry Song", exact: true })).toBeVisible();
          } else {
            await expect(retry).toBeEnabled();
            await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
          }
          expect(requests.slice(before).filter((request) => request.rsc)).toHaveLength(1);
          expect(requests.filter((request) => request.document)).toHaveLength(0);
          expect(await page.evaluate(() => document.documentElement.dataset.retryDocument)).toBe(marker);
          expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(path);
          await expectNoOverflow();
          cycles.push({ recovered: shouldRecover, rscRequests: requests.slice(before).filter((request) => request.rsc).length,
            documentRequests: requests.filter((request) => request.document).length, pendingDisabled: true });
        } finally {
          release();
          await disposeRoute();
        }
      }
      await page.screenshot({ path: testInfo.outputPath("recovered.png") });
      const evidencePath = testInfo.outputPath("retry-evidence.json");
      await writeFile(evidencePath, JSON.stringify({ target, theme, project: testInfo.project.name,
        targetHeight, outlineWidth, cycles, requests, sameDocument: true, recovered: true }, null, 2));
      await testInfo.attach("retry-evidence", { path: evidencePath, contentType: "application/json" });
    });
  }
}
