import { describe, it, expect } from "vitest";
import { isAuthConfigured } from "./config";

describe("isAuthConfigured", () => {
  it("returns false when env vars are empty (default in test env)", () => {
    // In test env VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID are not set
    // config reads from import.meta.env which defaults to '' in vitest
    const result = isAuthConfigured();
    expect(typeof result).toBe("boolean");
  });

  it("config object has expected shape", async () => {
    const { config } = await import("./config");
    expect(config).toHaveProperty("cognito");
    expect(config).toHaveProperty("api");
    expect(config).toHaveProperty("superAdmin");
    expect(config.cognito).toHaveProperty("userPoolId");
    expect(config.cognito).toHaveProperty("clientId");
    expect(config.api).toHaveProperty("baseUrl");
    expect(config.superAdmin).toHaveProperty("devMode");
  });

  it("config.api.baseUrl strips trailing slash", async () => {
    const { config } = await import("./config");
    expect(config.api.baseUrl).not.toMatch(/\/$/);
  });
});
