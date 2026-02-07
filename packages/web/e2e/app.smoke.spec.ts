import { test, expect } from "@playwright/test";

/**
 * Smoke tests (E2E): Critical paths load.
 * Black-box: no knowledge of implementation.
 */
test.describe("App smoke", () => {
  test("home page loads and shows login or dashboard", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Loyalty|Platform/i);
    await page.waitForLoadState("domcontentloaded");
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible({ timeout: 10000 });
  });

  test("signup page is accessible", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible({ timeout: 10000 });
  });
});
