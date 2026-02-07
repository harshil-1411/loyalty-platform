import { describe, it, expect, vi, beforeEach } from "vitest";
import * as client from "./client";
import { getBillingStatus, createSubscriptionLink } from "./billing";

vi.mock("./client");

describe("Billing API", () => {
  const tenantId = "tenant-1";
  const idToken = "token";

  beforeEach(() => {
    vi.mocked(client.apiGet).mockResolvedValue({});
    vi.mocked(client.apiPost).mockResolvedValue({});
  });

  it("getBillingStatus calls apiGet", async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      planId: "growth",
      billingStatus: "active",
      currentPeriodEnd: "2025-03-01",
      razorpaySubscriptionId: "sub_1",
    });
    const res = await getBillingStatus(tenantId, idToken);
    expect(client.apiGet).toHaveBeenCalledWith(
      "/api/v1/billing/status",
      tenantId,
      idToken
    );
    expect(res.planId).toBe("growth");
  });

  it("createSubscriptionLink calls apiPost with planKey", async () => {
    vi.mocked(client.apiPost).mockResolvedValue({
      shortUrl: "https://pay.example.com/checkout",
      subscriptionId: "sub_2",
    });
    const res = await createSubscriptionLink(
      tenantId,
      { planKey: "starter" },
      idToken
    );
    expect(client.apiPost).toHaveBeenCalledWith(
      "/api/v1/billing/subscription-link",
      tenantId,
      { planKey: "starter" },
      idToken
    );
    expect(res.shortUrl).toBe("https://pay.example.com/checkout");
  });
});
