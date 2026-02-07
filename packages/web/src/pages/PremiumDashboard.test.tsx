import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PremiumDashboard } from "./PremiumDashboard";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";

function renderDashboard() {
  return render(
    <MemoryRouter>
      <PremiumDashboard />
    </MemoryRouter>
  );
}

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({
    state: {
      status: "authenticated",
      user: { sub: "tenant-123", email: "user@example.com", username: "user" },
    },
  }),
}));

vi.mock("@/hooks/useDashboardMetrics", () => ({
  useDashboardMetrics: vi.fn(),
}));

const mockDashboardData = {
  metrics: {
    totalPoints: 125_000,
    activePrograms: 3,
    transactionsCount: 1_420,
    rewardsRedeemed: 89,
  },
  charts: {
    pointsByProgram: [
      { name: "Loyalty Plus", value: 52000 },
      { name: "Rewards Gold", value: 48000 },
      { name: "Cashback", value: 25000 },
    ],
    transactionsOverTime: [
      { name: "Mon", value: 210 },
      { name: "Tue", value: 185 },
      { name: "Wed", value: 240 },
    ],
  },
};

function mockUseDashboardMetrics(overrides: {
  data?: typeof mockDashboardData | null;
  loading?: boolean;
  error?: string | null;
} = {}) {
  vi.mocked(useDashboardMetrics).mockReturnValue({
    data: overrides.data ?? mockDashboardData,
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    refetch: vi.fn(),
  });
}

describe("PremiumDashboard", () => {
  beforeEach(() => {
    mockUseDashboardMetrics();
  });

  it("renders without crashing", () => {
    const { container } = renderDashboard();
    expect(container).toBeInTheDocument();
  });

  it("displays key metrics with plain-language labels", () => {
    renderDashboard();

    expect(screen.getByRole("heading", { name: /total points/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /active programs/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^transactions$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /rewards redeemed/i })).toBeInTheDocument();

    expect(screen.getByText("125,000")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1,420")).toBeInTheDocument();
    expect(screen.getByText("89")).toBeInTheDocument();
  });

  it("gives each metric one clear action (recognition, user control)", () => {
    renderDashboard();

    expect(screen.getByRole("link", { name: /view transactions/i })).toHaveAttribute("href", "/transactions");
    expect(screen.getByRole("link", { name: /manage programs/i })).toHaveAttribute("href", "/programs");
    expect(screen.getByRole("link", { name: /view history/i })).toHaveAttribute("href", "/transactions");
    expect(screen.getByRole("link", { name: /view rewards/i })).toHaveAttribute("href", "/rewards");
  });

  it("displays Breakdown section with charts", () => {
    renderDashboard();

    expect(screen.getByRole("heading", { name: /breakdown/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /points by program/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /transactions this week/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Points by program")).toBeInTheDocument();
    expect(screen.getByLabelText("Transactions this week")).toBeInTheDocument();
  });

  it("shows loading state with visible status (visibility of system status)", () => {
    mockUseDashboardMetrics({ data: null, loading: true });
    renderDashboard();
    const status = screen.getByRole("status", { name: /loading dashboard/i });
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it("shows error in plain language with recovery action (error recovery)", () => {
    mockUseDashboardMetrics({ data: null, error: "Network error" });
    renderDashboard();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/load your dashboard/i);
    expect(alert).toHaveTextContent("Network error");
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls refetch when Try again is clicked", async () => {
    const refetch = vi.fn();
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: null,
      loading: false,
      error: "Failed",
      refetch,
    });
    const user = userEvent.setup();
    renderDashboard();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
