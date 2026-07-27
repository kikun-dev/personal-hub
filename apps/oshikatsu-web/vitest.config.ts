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
    // playwright/ 配下はE2E本体（*.spec.ts）ではなく、その補助モジュールのunit testだけを拾う。
    // components/ 配下は、UI から独立した純粋モジュール（*FormValues 等）の
    // unit test だけを拾う。DOM を要する component test の基盤は未導入（#442）。
    include: [
      "lib/**/*.test.ts",
      "usecases/**/*.test.ts",
      "playwright/**/*.test.ts",
      "components/**/*.test.ts",
    ],
  },
});
