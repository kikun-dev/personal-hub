import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    // 収集対象は `rules/implementation.md`「テスト」節に従う。
    // components/ と playwright/ は、JSX / ランタイムに依存しない純粋モジュール
    // （*FormValues 等）の *.test.ts だけが対象。E2E 本体は *.spec.ts なので拾わない。
    // DOM を要する component test の基盤は未導入（#442）。
    include: [
      "lib/**/*.test.ts",
      "usecases/**/*.test.ts",
      "playwright/**/*.test.ts",
      "components/**/*.test.ts",
    ],
  },
});
