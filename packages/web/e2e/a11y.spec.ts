import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility (a11y) E2E: axe-core WCAG 2.1 AA on key pages.
 * Run with: npm run test:e2e -- e2e/a11y.spec.ts
 * Optional: E2E_AUTH=1 to include protected pages (contact, dashboard); requires Cognito mock or test user.
 */

function expectNoCriticalViolations(violations: Array<{ id: string; impact?: string; description: string }>) {
  const critical = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  if (critical.length > 0) {
    const msg = critical
      .map((v) => `[${v.id}] ${v.description}`)
      .join("\n");
    throw new Error(`A11y violations (critical/serious):\n${msg}`);
  }
}

test.describe("Accessibility (axe)", () => {
  test("login page has no critical/serious axe violations", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("heading", { name: /sign in/i }).waitFor({ state: "visible", timeout: 10000 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expectNoCriticalViolations(results.violations);
  });

  test("signup page has no critical/serious axe violations", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("heading", { name: /create account/i }).waitFor({ state: "visible", timeout: 10000 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expectNoCriticalViolations(results.violations);
  });

  test("contact page has no critical/serious axe violations", async ({ page }) => {
    test.skip(!process.env.E2E_AUTH, "Contact is under protected layout; run with E2E_AUTH=1");
    const idTokenPayload = btoa(
      JSON.stringify({ sub: "tenant-1", "cognito:username": "test" })
    );
    const idToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${idTokenPayload}.x`;
    await page.route("*cognito-idp*.amazonaws.com*", async (route) => {
      if (route.request().header("X-Amz-Target")?.includes("InitiateAuth")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            AuthenticationResult: {
              IdToken: idToken,
              AccessToken: "access",
              RefreshToken: "refresh",
              ExpiresIn: 3600,
              TokenType: "Bearer",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
    await page.goto("/login");
    await page.getByLabel(/username or email/i).fill("testuser");
    await page.getByLabel(/password/i).fill("TestPassword1!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\//, { timeout: 15000 });
    await page.goto("/contact");
    await page.getByRole("heading", { name: /contact/i }).waitFor({ state: "visible", timeout: 10000 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expectNoCriticalViolations(results.violations);
  });

  test("home page (login or dashboard) has no critical/serious axe violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expectNoCriticalViolations(results.violations);
  });

  // When E2E_AUTH=1, run: dashboard (authenticated) axe check (mock Cognito + login first).
  test("dashboard (authenticated) has no critical/serious axe violations", async ({ page }) => {
    test.skip(!process.env.E2E_AUTH, "Requires E2E_AUTH=1");
    const idTokenPayload = btoa(
      JSON.stringify({ sub: "tenant-1", "cognito:username": "test" })
    );
    const idToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${idTokenPayload}.x`;
    await page.route("*cognito-idp*.amazonaws.com*", async (route) => {
      if (route.request().header("X-Amz-Target")?.includes("InitiateAuth")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            AuthenticationResult: {
              IdToken: idToken,
              AccessToken: "access",
              RefreshToken: "refresh",
              ExpiresIn: 3600,
              TokenType: "Bearer",
            },
          }),
        });
      } else {
        await route.continue();
      }
    });
    await page.goto("/login");
    await page.getByLabel(/username or email/i).fill("testuser");
    await page.getByLabel(/password/i).fill("TestPassword1!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\//, { timeout: 15000 });
    await page.getByRole("heading", { name: /dashboard/i }).waitFor({ state: "visible", timeout: 10000 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expectNoCriticalViolations(results.violations);
  });
});
