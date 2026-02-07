import { test, expect } from "@playwright/test";

/**
 * E2E critical flows: login → dashboard, create program, earn points, redeem.
 * Uses mocked API responses for deterministic runs (local or CI).
 * Auth-dependent tests are skipped unless E2E_AUTH=1 (Cognito configured + mock or test user).
 */
const skipAuthFlows = !process.env.E2E_AUTH;

test.describe("Critical user flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("unauthenticated user sees login and can navigate to signup", async ({ page }) => {
    await page.waitForLoadState("domcontentloaded");
    const loginHeading = page.getByRole("heading", { name: /sign in/i });
    const signupLink = page.getByRole("link", { name: /sign up/i });
    await expect(loginHeading).toBeVisible({ timeout: 10000 });
    await signupLink.click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
  });

  test.skip(skipAuthFlows, "login flow with mocked auth redirects to dashboard", async ({ page }) => {
    // amazon-cognito-identity-js calls cognito-idp.<region>.amazonaws.com with InitiateAuth
    const idTokenPayload = btoa(
      JSON.stringify({
        sub: "tenant-1",
        "cognito:username": "test",
        region: "us-east-1",
      })
    );
    const idToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${idTokenPayload}.x`;

    await page.route("*cognito-idp*.amazonaws.com*", async (route) => {
      const request = route.request();
      if (request.header("X-Amz-Target")?.includes("InitiateAuth")) {
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

    await expect(page).toHaveURL(/\//, { timeout: 15000 });
    const dashboard = page.getByRole("heading", { name: /dashboard/i });
    await expect(dashboard).toBeVisible({ timeout: 10000 });
  });

  test.skip(skipAuthFlows, "programs page shows create program when authenticated", async ({ page }) => {
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
      } else await route.continue();
    });
    await page.route("**/api/v1/programs**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ programs: [{ programId: "p1", name: "Test Program", currency: "INR" }] }),
        });
      } else {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ programId: "p2", name: "New Program", currency: "INR" }),
        });
      }
    });

    await page.goto("/login");
    await page.getByLabel(/username or email/i).fill("testuser");
    await page.getByLabel(/password/i).fill("TestPassword1!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\//, { timeout: 15000 });

    await page.goto("/programs");
    await expect(page.getByRole("heading", { name: /programs/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /create program/i })).toBeVisible();
  });

  test.skip(skipAuthFlows, "transactions page shows earn/burn when authenticated", async ({ page }) => {
    const idTokenPayload = btoa(JSON.stringify({ sub: "tenant-1" }));
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
      } else await route.continue();
    });
    await page.route("**/api/v1/programs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ programs: [{ programId: "p1", name: "Loyalty", currency: "INR" }] }),
      });
    });
    await page.route("**/api/v1/programs/**/balance/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ memberId: "m1", programId: "p1", balance: 100 }),
      });
    });

    await page.goto("/login");
    await page.getByLabel(/username or email/i).fill("testuser");
    await page.getByLabel(/password/i).fill("TestPassword1!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\//, { timeout: 15000 });

    await page.goto("/transactions");
    await expect(page.getByRole("heading", { name: /balance|transactions/i })).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder(/member_123|user sub/i).fill("member_1");
    await expect(page.getByText(/points/)).toBeVisible({ timeout: 5000 });
  });

  test.skip(skipAuthFlows, "rewards page shows catalog and redeem tabs when authenticated", async ({ page }) => {
    const idTokenPayload = btoa(JSON.stringify({ sub: "tenant-1" }));
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
      } else await route.continue();
    });
    await page.route("**/api/v1/programs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ programs: [{ programId: "p1", name: "Loyalty", currency: "INR" }] }),
      });
    });
    await page.route("**/api/v1/programs/**/rewards**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ rewards: [{ rewardId: "r1", name: "Coffee", pointsCost: 50 }] }),
      });
    });

    await page.goto("/login");
    await page.getByLabel(/username or email/i).fill("testuser");
    await page.getByLabel(/password/i).fill("TestPassword1!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\//, { timeout: 15000 });

    await page.goto("/rewards");
    await expect(page.getByRole("heading", { name: /rewards/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("tab", { name: /catalog/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /redeem/i })).toBeVisible();
  });
});
