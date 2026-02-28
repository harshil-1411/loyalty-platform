/**
 * Playwright global auth setup.
 * Logs in with the real Cognito test user (E2E_USERNAME / E2E_PASSWORD from .env.e2e)
 * and saves browser storage state to playwright/.auth/user.json so all authenticated
 * tests can reuse the session without logging in again.
 *
 * Requires the dev server to be running (vite dev on port 5173).
 * Run with: npx playwright test --project=setup
 */
import { test as setup, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env.e2e") });

export const AUTH_FILE = path.resolve(__dirname, "../playwright/.auth/user.json");

setup("authenticate as e2e-test-user", async ({ page }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.e2e");
  }

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible({ timeout: 10_000 });

  await page.getByLabel(/username or email/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait until redirected away from /login (auth succeeded)
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });

  // Persist the authenticated browser context
  await page.context().storageState({ path: AUTH_FILE });
});
