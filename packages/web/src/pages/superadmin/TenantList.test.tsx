import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TenantList } from "./TenantList";
import * as superadminApi from "@/api/superadmin";

vi.mock("@/api/superadmin", () => ({
  listTenants: vi.fn(),
}));

const mockTenants = [
  {
    id: "t-001",
    name: "GlowUp Salon",
    slug: "glowup",
    plan: "growth" as const,
    billingStatus: "active" as const,
    memberCount: 1000,
    programCount: 2,
    transactionCount: 500,
    mrr: 3999,
    createdAt: "2025-01-01T00:00:00Z",
    contactEmail: "ops@glowup.in",
  },
  {
    id: "t-002",
    name: "FreshBasket Retail",
    slug: "freshbasket",
    plan: "scale" as const,
    billingStatus: "trialing" as const,
    memberCount: 500,
    programCount: 1,
    transactionCount: 100,
    mrr: 0,
    createdAt: "2025-02-01T00:00:00Z",
    contactEmail: "tech@freshbasket.in",
  },
];

function renderTenantList() {
  return render(
    <MemoryRouter>
      <TenantList />
    </MemoryRouter>
  );
}

describe("TenantList", () => {
  beforeEach(() => {
    vi.mocked(superadminApi.listTenants).mockResolvedValue(mockTenants);
  });

  it("shows loading state initially (positive)", () => {
    renderTenantList();
    expect(screen.getByText(/loading tenants/i)).toBeInTheDocument();
  });

  it("renders heading and tenant count after load (positive)", async () => {
    renderTenantList();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /tenants/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/registered tenants/i)).toBeInTheDocument();
  });

  it("renders search input and filter controls (positive)", async () => {
    renderTenantList();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /tenants/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("searchbox", { name: /search tenants/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /filter by plan/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /filter by status/i })).toBeInTheDocument();
  });

  it("renders tenant rows with names and links to detail (positive)", async () => {
    renderTenantList();
    await waitFor(() => {
      expect(screen.getAllByRole("link", { href: "/admin/tenants/t-001" }).length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("GlowUp Salon").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("FreshBasket Retail").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("link", { href: "/admin/tenants/t-002" }).length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when filters match no tenants (positive)", async () => {
    renderTenantList();
    await waitFor(() => {
      expect(screen.getAllByText("GlowUp Salon").length).toBeGreaterThanOrEqual(1);
    });
    const search = screen.getByRole("searchbox", { name: /search tenants/i });
    await userEvent.type(search, "xyznonexistent");
    await waitFor(() => {
      expect(screen.getByText(/no tenants found/i)).toBeInTheDocument();
    });
    const clearButtons = screen.getAllByRole("button", { name: /clear filters/i });
    expect(clearButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls listTenants on mount (positive)", async () => {
    renderTenantList();
    await waitFor(() => {
      expect(superadminApi.listTenants).toHaveBeenCalled();
    });
  });
});
