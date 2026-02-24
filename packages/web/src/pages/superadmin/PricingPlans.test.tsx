import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PricingPlans } from "./PricingPlans";
import * as superadminApi from "@/api/superadmin";

vi.mock("@/api/superadmin", () => ({
  listPricingPlans: vi.fn(),
  getPlanDistribution: vi.fn(),
}));

const mockPlans = [
  { key: "starter" as const, name: "Starter", priceRange: "₹999 – ₹1,499/mo", monthlyPrice: 999, features: ["1 program"], limits: { programs: 1, members: 1000 } },
  { key: "growth" as const, name: "Growth", priceRange: "₹2,999 – ₹4,999/mo", monthlyPrice: 2999, features: ["Multiple programs"], limits: { programs: 10, members: 10000 } },
  { key: "scale" as const, name: "Scale / Enterprise", priceRange: "Custom", monthlyPrice: 9999, features: ["Unlimited"], limits: { programs: "Unlimited" as const, members: "Unlimited" as const } },
];

const mockDistribution = [
  { plan: "Starter", count: 4 },
  { plan: "Growth", count: 3 },
  { plan: "Scale", count: 2 },
  { plan: "No Plan", count: 1 },
];

function renderPricingPlans() {
  return render(
    <MemoryRouter>
      <PricingPlans />
    </MemoryRouter>
  );
}

describe("PricingPlans", () => {
  beforeEach(() => {
    vi.mocked(superadminApi.listPricingPlans).mockResolvedValue(mockPlans);
    vi.mocked(superadminApi.getPlanDistribution).mockResolvedValue(mockDistribution);
  });

  it("shows loading state initially (positive)", () => {
    renderPricingPlans();
    expect(screen.getByText(/loading pricing plans/i)).toBeInTheDocument();
  });

  it("renders heading and plan cards after load (positive)", async () => {
    renderPricingPlans();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /pricing plans/i })).toBeInTheDocument();
    });
    expect(screen.getAllByText("Starter").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Growth").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Scale / Enterprise").length).toBeGreaterThanOrEqual(1);
  });

  it("renders feature comparison table after load (positive)", async () => {
    renderPricingPlans();
    await waitFor(() => {
      expect(screen.getByText(/feature comparison/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("calls listPricingPlans and getPlanDistribution on mount (positive)", async () => {
    renderPricingPlans();
    await waitFor(() => {
      expect(superadminApi.listPricingPlans).toHaveBeenCalled();
      expect(superadminApi.getPlanDistribution).toHaveBeenCalled();
    });
  });
});
