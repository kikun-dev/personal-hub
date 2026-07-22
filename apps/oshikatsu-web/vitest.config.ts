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
    include: ["lib/**/*.test.ts", "usecases/**/*.test.ts", "playwright/**/*.test.ts"],
  },
});
