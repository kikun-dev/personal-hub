import path from "node:path";
import { defineConfig } from "vitest/config";

// #383: Top Page bounded read の実DB execution plan 検証用 driver 専用設定。
// 既存の vitest.config.ts（unit test 用、`pnpm test:unit` = `vitest run`）とは
// include を分離し、この perf driver が通常の CI / `vitest run` に一切
// 含まれないようにする（point-in-time の計測ツールのため）。
// 実行: `pnpm --filter oshikatsu-web perf:driver`
// （ローカル Supabase が起動していない/フィクスチャ未適用の環境では失敗する。
// 事前手順は scripts/perf/README.md を参照）
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["scripts/perf/**/*.perf.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // 計測ツールとしての性質上、console.log（シナリオ区切り・結果件数）を
    // 常に表示したいため verbose reporter を既定にする。
    reporters: ["verbose"],
  },
});
