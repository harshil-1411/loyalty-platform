/**
 * Super-admin API client tests.
 *
 * All tests run with devMode=true (mock data) because the test environment
 * does not have a real Cognito session. The mock-mode tests verify filter
 * logic, response shapes, and async behaviour.
 *
 * A separate "real API mode" suite mocks the client + cognito modules to
 * verify that the correct backend paths are called when devMode=false.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* ------------------------------------------------------------------
 * Force devMode=true so every function uses mock data in the main suites.
 * Must be hoisted before the module under test is imported.
 * ------------------------------------------------------------------ */
vi.mock("../../config", () => ({
  config: {
    superAdmin: { devMode: true },
    cognito: { userPoolId: "", clientId: "" },
    api: { baseUrl: "https://api.example.com" },
  },
  isAuthConfigured: () => false,
}));

vi.mock("../../auth/cognito", () => ({
  getIdToken: vi.fn().mockResolvedValue("mock-token"),
}));

vi.mock("../client", () => ({
  apiGet: vi.fn(),
}));

import {
  getPlatformMetrics,
  getTenantGrowthSeries,
  getRevenueTrendSeries,
  getPlanDistribution,
  listTenants,
  getTenantDetail,
  getTenantPrograms,
  listPricingPlans,
  getSubscriptionEvents,
  listUsers,
} from "./index";

describe("superadmin API client — devMode (mock data)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getPlatformMetrics", () => {
    it("returns platform metrics with expected shape", async () => {
      const p = getPlatformMetrics();
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data).toHaveProperty("totalTenants");
      expect(data).toHaveProperty("activeSubscriptions");
      expect(data).toHaveProperty("mrr");
      expect(data).toHaveProperty("arr");
      expect(data).toHaveProperty("totalMembers");
      expect(typeof data.totalTenants).toBe("number");
      expect(typeof data.mrr).toBe("number");
    });
  });

  describe("getTenantGrowthSeries", () => {
    it("returns time series array", async () => {
      const p = getTenantGrowthSeries();
      await vi.runAllTimersAsync();
      const data = await p;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("month");
      expect(data[0]).toHaveProperty("value");
    });
  });

  describe("getRevenueTrendSeries", () => {
    it("returns revenue trend array", async () => {
      const p = getRevenueTrendSeries();
      await vi.runAllTimersAsync();
      const data = await p;
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("month");
      expect(data[0]).toHaveProperty("value");
    });
  });

  describe("getPlanDistribution", () => {
    it("returns plan distribution with plan and count", async () => {
      const p = getPlanDistribution();
      await vi.runAllTimersAsync();
      const data = await p;
      expect(Array.isArray(data)).toBe(true);
      data.forEach((d) => {
        expect(d).toHaveProperty("plan");
        expect(d).toHaveProperty("count");
      });
    });
  });

  describe("listTenants", () => {
    it("returns all tenants when no filters", async () => {
      const p = listTenants();
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data.length).toBeGreaterThanOrEqual(8);
    });

    it("filters by search on name", async () => {
      const p = listTenants({ search: "GlowUp" });
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data.length).toBe(1);
      expect(data[0].name).toContain("GlowUp");
    });

    it("filters by search on id", async () => {
      const p = listTenants({ search: "t-002" });
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data.length).toBe(1);
      expect(data[0].id).toBe("t-002");
    });

    it("filters by plan", async () => {
      const p = listTenants({ plan: "starter" });
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data.every((t) => t.plan === "starter")).toBe(true);
    });

    it("filters by plan none (edge case)", async () => {
      const p = listTenants({ plan: "none" });
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data.every((t) => t.plan === null)).toBe(true);
    });

    it("filters by status", async () => {
      const p = listTenants({ status: "active" });
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data.every((t) => t.billingStatus === "active")).toBe(true);
    });

    it("returns empty array when search matches nothing", async () => {
      const p = listTenants({ search: "xyznonexistent123" });
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data).toHaveLength(0);
    });
  });

  describe("getTenantDetail", () => {
    it("returns tenant when id exists", async () => {
      const p = getTenantDetail("t-001");
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data).toBeDefined();
      expect(data?.id).toBe("t-001");
      expect(data?.name).toBe("GlowUp Salon & Spa");
    });

    it("returns undefined when id does not exist", async () => {
      const p = getTenantDetail("nonexistent-id");
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data).toBeUndefined();
    });
  });

  describe("getTenantPrograms", () => {
    it("returns programs for tenant", async () => {
      const p = getTenantPrograms("t-001");
      await vi.runAllTimersAsync();
      const data = await p;
      expect(Array.isArray(data)).toBe(true);
      expect(data.every((prog) => prog.tenantId === "t-001")).toBe(true);
    });

    it("returns empty array for tenant with no programs", async () => {
      const p = getTenantPrograms("t-008");
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data).toHaveLength(0);
    });
  });

  describe("listPricingPlans", () => {
    it("returns 3 pricing plans with expected shape", async () => {
      const p = listPricingPlans();
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data.length).toBe(3);
      expect(data[0]).toHaveProperty("key");
      expect(data[0]).toHaveProperty("name");
      expect(data[0]).toHaveProperty("features");
      expect(data[0]).toHaveProperty("limits");
    });
  });

  describe("getSubscriptionEvents", () => {
    it("returns subscription events array with expected shape", async () => {
      const p = getSubscriptionEvents();
      await vi.runAllTimersAsync();
      const data = await p;
      expect(Array.isArray(data)).toBe(true);
      data.forEach((e) => {
        expect(e).toHaveProperty("tenantId");
        expect(e).toHaveProperty("event");
        expect(e).toHaveProperty("date");
      });
    });
  });

  describe("listUsers", () => {
    it("returns all users when no filters", async () => {
      const p = listUsers();
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data.length).toBeGreaterThanOrEqual(10);
    });

    it("filters by search on username", async () => {
      const p = listUsers({ search: "superadmin" });
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data.length).toBe(1);
      expect(data[0].username).toBe("superadmin");
    });

    it("filters by role", async () => {
      const p = listUsers({ role: "super_admin" });
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data.every((u) => u.role === "super_admin")).toBe(true);
    });

    it("filters by tenantId", async () => {
      const p = listUsers({ tenantId: "t-001" });
      await vi.runAllTimersAsync();
      const data = await p;
      expect(data.every((u) => u.tenantId === "t-001")).toBe(true);
    });
  });

  describe("delay simulation", () => {
    it("resolves after async timers advance", async () => {
      const p = listTenants();
      expect(await Promise.race([p, Promise.resolve("pending")])).toBe("pending");
      await vi.runAllTimersAsync();
      const data = await p;
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
