import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TenantDetail } from "./TenantDetail";
import * as superadminApi from "@/api/superadmin";

vi.mock("@/api/superadmin", () => ({
  getTenantDetail: vi.fn(),
  getTenantPrograms: vi.fn(),
}));

const mockTenant = {
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
};

const mockPrograms = [
  { id: "p-1", tenantId: "t-001", name: "Loyalty Plus", currency: "INR", memberCount: 600, createdAt: "2025-01-15T00:00:00Z" },
  { id: "p-2", tenantId: "t-001", name: "VIP Club", currency: "INR", memberCount: 400, createdAt: "2025-02-01T00:00:00Z" },
];

function renderTenantDetail(tenantId = "t-001") {
  return render(
    <MemoryRouter initialEntries={[`/admin/tenants/${tenantId}`]} initialIndex={0}>
      <Routes>
        <Route path="/admin/tenants/:tenantId" element={<TenantDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("TenantDetail", () => {
  beforeEach(() => {
    vi.mocked(superadminApi.getTenantDetail).mockResolvedValue(mockTenant);
    vi.mocked(superadminApi.getTenantPrograms).mockResolvedValue(mockPrograms);
  });

  it("shows loading state initially (positive)", () => {
    renderTenantDetail();
    expect(screen.getByText(/loading tenant details/i)).toBeInTheDocument();
  });

  it("shows not found when tenant id does not exist (negative)", async () => {
    vi.mocked(superadminApi.getTenantDetail).mockResolvedValue(undefined);
    renderTenantDetail("nonexistent");
    await waitFor(() => {
      expect(screen.getByText(/tenant not found/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/no tenant with id/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to tenants/i })).toHaveAttribute("href", "/admin/tenants");
  });

  it("renders breadcrumb with link back to tenants (positive)", async () => {
    renderTenantDetail();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /glowup salon/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /tenants/i })).toHaveAttribute("href", "/admin/tenants");
  });

  it("renders tenant name and status badge (positive)", async () => {
    renderTenantDetail();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /glowup salon/i })).toBeInTheDocument();
    });
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
  });

  it("renders stat cards for programs, members, transactions (positive)", async () => {
    renderTenantDetail();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /programs/i })).toBeInTheDocument();
    });
    expect(screen.getByText("2")).toBeInTheDocument(); // program count
    expect(screen.getByText("1,000")).toBeInTheDocument(); // members
  });

  it("renders tabs Overview, Programs, Billing (positive)", async () => {
    renderTenantDetail();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("tab", { name: /programs/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /billing/i })).toBeInTheDocument();
  });

  it("renders programs in Programs tab (positive)", async () => {
    const user = userEvent.setup();
    renderTenantDetail();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /programs/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("tab", { name: /programs/i }));
    await waitFor(() => {
      expect(screen.getAllByText("Loyalty Plus").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("VIP Club").length).toBeGreaterThanOrEqual(1);
  });
});
