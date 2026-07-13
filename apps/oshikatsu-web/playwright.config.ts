import { defineConfig, devices } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

export default defineConfig({
  testDir: "./playwright",
  use: {
    baseURL: "http://localhost:3001",
    storageState: process.env.CI ? undefined : authFile,
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
