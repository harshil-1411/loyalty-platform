import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.resolve(__dirname, "playwright/.auth/user.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    // 1. Auth setup — run once before authenticated tests
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    // 2. Standard unauthenticated tests (login page, signup, public pages)
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /auth\.setup\.ts/,
    },

    // 3. Authenticated tests — depend on setup project, reuse saved session
    //    Only enabled when E2E_AUTH=1 (requires running dev server + real Cognito)
    ...(process.env.E2E_AUTH === "1"
      ? [
          {
            name: "authenticated",
            use: {
              ...devices["Desktop Chrome"],
              storageState: AUTH_FILE,
            },
            dependencies: ["setup"],
            testMatch: /flows\.spec\.ts/,
          },
        ]
      : []),
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});
