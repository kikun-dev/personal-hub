import { defineConfig, devices } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

export default defineConfig({
  testDir: "./playwright",
  // #413: spec ファイル間の並列実行が prod サーバ + ローカル Supabase の取得を過負荷にし
  // （RepositoryError）timing も崩してフレークの主因になっていたため、スイート全体を単一 worker で
  // 直列実行する。全 test が順に走るので、失敗が「did not run」で隠れることもない。
  workers: 1,
  // #413: CI では flaky を1回だけ retry する。ローカルは retry しない（実失敗を隠さない）。
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:3001",
    storageState: process.env.CI ? undefined : authFile,
  },
  // #413: dev（next dev）の on-demand compile が並列初回アクセスで timeout しフレークになるため、
  // production build を start して配信する。ここでの timeout は server 起動（build + start）の
  // budget であり、テスト自体の timeout は変更しない（フレークの原因は compile 遅延であって
  // timeout 不足ではないため）。
  // reuseExistingServer（ローカルのみ true）: 既に 3001 で起動中のサーバがあれば再利用する。
  // 安定した full run が欲しいときは dev server を止めてから実行し、build + start を使わせる。
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 17"],
      },
    },
  ],
});
