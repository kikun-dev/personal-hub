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
  // reuseExistingServer は既定で false。#413 の中核契約は「現在の HEAD の production build に対して
  // 検証する」ことなので、3001 に残った dev server や別 build を再利用させない（port 使用中なら
  // Playwright が明示 fail する）。開発中に dev server を再利用して素早く回したいときだけ
  // `E2E_REUSE_SERVER=1` で opt-in する（この場合は production build 契約が外れる点に注意）。
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3001",
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
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
