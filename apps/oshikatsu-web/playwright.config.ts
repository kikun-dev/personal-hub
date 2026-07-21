import { defineConfig, devices } from "@playwright/test";
import { parseStrictYmd } from "./lib/dateParams";

const authFile = "playwright/.auth/user.json";

// #412: E2E の「今日」を固定し、日付依存 spec（TOP）を実行日に依存させない。この1箇所が固定日の
// 唯一の管理点。既定 2026-08-23 は seed のライブ公演日が 2024 / 2025 / 2026 に存在する MM-DD で、
// 次を同時に満たす:
//   - 今日(2026-08-23)のライブ → TOP「今日の予定」（`stacked-event`）が空にならない
//   - 過去年(2024/2025-08-23)のライブ → TOP「過去の同日」（`past-same-day-events` / `timeline-event`）が出る
//   - 実データの参加記録の多くより後の日付 → 「最近の参加記録」（過去分）が出る
// server（getTodayInAppTimeZone の env seam）とテストランナー（spec 内の同関数）の双方で同じ「今日」を
// 共有させるため、config プロセスの env にも設定し webServer.env にも渡す。
function resolveFixedToday(): string {
  const explicit = process.env.E2E_FIXED_TODAY;
  // 再利用モード（E2E_REUSE_SERVER=1）では webServer.command が実行されず webServer.env が既存 server
  // へ渡らないため、既定値を暗黙に使うと server（実日付）と spec（固定日）が食い違い、日付依存が再発する。
  // 明示を必須にして fail-fast する（operator は同じ E2E_FIXED_TODAY で server も起動する。README 参照）。
  if (process.env.E2E_REUSE_SERVER === "1" && !explicit) {
    throw new Error(
      "E2E_REUSE_SERVER=1 のときは E2E_FIXED_TODAY=YYYY-MM-DD を明示し、再利用する server も同じ値で起動してください（server と spec の『今日』を一致させるため）。"
    );
  }
  const value = explicit ?? "2026-08-23";
  // 不正な固定日（範囲外・存在しない日・形式違い）は実日付へ暗黙 fallback させず、ここで fail-fast する。
  if (parseStrictYmd(value) === null) {
    throw new Error(
      `E2E_FIXED_TODAY が不正です: "${value}"。YYYY-MM-DD の実在日付を指定してください。`
    );
  }
  return value;
}

const E2E_FIXED_TODAY = resolveFixedToday();
process.env.E2E_FIXED_TODAY = E2E_FIXED_TODAY;

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
    // #412: server プロセスの getTodayInAppTimeZone が同じ固定「今日」を返すよう env を渡す。
    env: { E2E_FIXED_TODAY },
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
