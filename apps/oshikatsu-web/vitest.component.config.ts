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
    include: ["components/**/*.test.tsx"],
    setupFiles: ["./vitest.component.setup.ts"],
    restoreMocks: true,
  },
});
