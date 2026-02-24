import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BillingOverview } from "./BillingOverview";
import * as superadminApi from "@/api/superadmin";

vi.mock("@/api/superadmin", () => ({
  getPlatformMetrics: vi.fn(),
  getRevenueTrendSeries: vi.fn(),
  getPlanDistribution: vi.fn(),
  getSubscriptionEvents: vi.fn(),
}));

const mockMetrics = {
  totalTenants: 10,
  activeSubscriptions: 7,
  trialSubscriptions: 2,
  totalMembers: 50000,
  totalTransactions: 200000,
  mrr: 35000,
  arr: 420000,
  mrrGrowthPct: 12,
  churnPct: 2,
  pastDueCount: 1,
};

const mockRevenue = [{ month: "Jan", value: 30000 }];
const mockPlans = [{ plan: "Starter", count: 4 }];
const mockEvents = [
  { id: "e1", tenantId: "t1", tenantName: "Acme", event: "renewed" as const, plan: "growth" as const, amount: 3999, date: "2026-02-01T00:00:00Z" },
];

function renderBillingOverview() {
  return render(
    <MemoryRouter>
      <BillingOverview />
    </MemoryRouter>
  );
}

describe("BillingOverview", () => {
  beforeEach(() => {
    vi.mocked(superadminApi.getPlatformMetrics).mockResolvedValue(mockMetrics);
    vi.mocked(superadminApi.getRevenueTrendSeries).mockResolvedValue(mockRevenue);
    vi.mocked(superadminApi.getPlanDistribution).mockResolvedValue(mockPlans);
    vi.mocked(superadminApi.getSubscriptionEvents).mockResolvedValue(mockEvents);
  });

  it("shows loading state initially (positive)", () => {
    renderBillingOverview();
    expect(screen.getByText(/loading billing overview/i)).toBeInTheDocument();
  });

  it("renders heading and KPIs after load (positive)", async () => {
    renderBillingOverview();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /billing overview/i })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/monthly revenue|revenue/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/active subscriptions/i)).toBeInTheDocument();
  });

  it("renders recent subscription events section (positive)", async () => {
    renderBillingOverview();
    await waitFor(() => {
      expect(screen.getByText(/recent subscription events/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText("Acme").length).toBeGreaterThanOrEqual(1);
  });

  it("calls all API functions on mount (positive)", async () => {
    renderBillingOverview();
    await waitFor(() => {
      expect(superadminApi.getPlatformMetrics).toHaveBeenCalled();
      expect(superadminApi.getSubscriptionEvents).toHaveBeenCalled();
    });
  });
});
