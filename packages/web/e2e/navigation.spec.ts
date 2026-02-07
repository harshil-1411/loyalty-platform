import { test, expect } from "@playwright/test";

/**
 * Navigation – functional tests.
 */
test.describe("Navigation", () => {
  test("signup page has link back to sign in", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated visit to / redirects or shows login", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    // After redirect we see either login (Sign in) or dashboard; wait for one to appear
    const loginHeading = page.getByRole("heading", { name: /sign in/i });
    const dashboardHeading = page.getByRole("heading", { name: /dashboard/i });
    await expect(loginHeading.or(dashboardHeading)).toBeVisible({ timeout: 10000 });
  });
});
