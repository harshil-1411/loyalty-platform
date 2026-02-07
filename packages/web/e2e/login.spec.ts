import { test, expect } from "@playwright/test";

/**
 * Login flow – functional & black-box.
 */
test.describe("Login", () => {
  test("shows sign in form with username and password", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/username or email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("link to sign up navigates to signup", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
  });

  test("submit with empty fields shows validation (browser required)", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    const username = page.getByLabel(/username or email/i);
    await expect(username).toHaveAttribute("required", "");
  });
});
