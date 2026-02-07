import { test, expect } from "@playwright/test";

/**
 * Performance tests: page load within acceptable time (black-box).
 */
test.describe("Performance", () => {
  test("login page loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/login");
    await page.getByRole("heading", { name: /sign in/i }).waitFor({ state: "visible", timeout: 10000 });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test("home page responds within 3 seconds", async ({ page }) => {
    const start = Date.now();
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(3000);
  });
});
