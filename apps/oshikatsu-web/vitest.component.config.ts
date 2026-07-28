import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3001/",
      },
    },
    // 配置先に依存せず、対象 Client Component と同階層のテストを収集する。
    // app/ 配下の page / error なども component test の対象になり得る（#442）。
    include: ["**/*.test.tsx"],
    setupFiles: ["./vitest.component.setup.ts"],
    restoreMocks: true,
  },
});
