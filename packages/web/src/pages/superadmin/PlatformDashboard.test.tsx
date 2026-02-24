import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PlatformDashboard } from "./PlatformDashboard";
import * as superadminApi from "@/api/superadmin";

vi.mock("@/api/superadmin", () => ({
  getPlatformMetrics: vi.fn(),
  getTenantGrowthSeries: vi.fn(),
  getRevenueTrendSeries: vi.fn(),
  getPlanDistribution: vi.fn(),
  listTenants: vi.fn(),
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

const mockGrowth = [{ month: "Jan", value: 5 }];
const mockRevenue = [{ month: "Jan", value: 10000 }];
const mockPlans = [{ plan: "Starter", count: 4 }, { plan: "Growth", count: 3 }];
const mockTenants = [
  { id: "t1", name: "Tenant A", memberCount: 5000 },
  { id: "t2", name: "Tenant B", memberCount: 3000 },
];

function mockAllResolved() {
  vi.mocked(superadminApi.getPlatformMetrics).mockResolvedValue(mockMetrics);
  vi.mocked(superadminApi.getTenantGrowthSeries).mockResolvedValue(mockGrowth);
  vi.mocked(superadminApi.getRevenueTrendSeries).mockResolvedValue(mockRevenue);
  vi.mocked(superadminApi.getPlanDistribution).mockResolvedValue(mockPlans);
  vi.mocked(superadminApi.listTenants).mockResolvedValue(mockTenants as never);
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <PlatformDashboard />
    </MemoryRouter>
  );
}

describe("PlatformDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAllResolved();
  });

  it("shows loading state initially (positive)", () => {
    renderDashboard();
    expect(screen.getByRole("status", { name: /loading dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/loading platform dashboard/i)).toBeInTheDocument();
  });

  it("renders page heading and subtitle after load (positive)", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /platform overview/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/holistic view of all tenants/i)).toBeInTheDocument();
  });

  it("renders KPI cards with metrics after load (positive)", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /platform overview/i })).toBeInTheDocument();
    });
    expect(screen.getByText("10")).toBeInTheDocument(); // total tenants
    expect(screen.getByText("7")).toBeInTheDocument(); // active subscriptions
    expect(screen.getByText(/50,000/)).toBeInTheDocument(); // total members
  });

  it("renders chart sections after load (positive)", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/revenue trend/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/tenant growth/i)).toBeInTheDocument();
    expect(screen.getByText(/plan distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/top tenants by members/i)).toBeInTheDocument();
  });

  it("renders links to tenants and billing (positive)", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /total tenants/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /view tenants/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view billing/i })).toBeInTheDocument();
  });

  it("calls all API functions on mount (positive)", async () => {
    renderDashboard();
    await waitFor(() => {
      expect(superadminApi.getPlatformMetrics).toHaveBeenCalled();
      expect(superadminApi.getTenantGrowthSeries).toHaveBeenCalled();
      expect(superadminApi.getRevenueTrendSeries).toHaveBeenCalled();
      expect(superadminApi.getPlanDistribution).toHaveBeenCalled();
      expect(superadminApi.listTenants).toHaveBeenCalled();
    });
  });
});
