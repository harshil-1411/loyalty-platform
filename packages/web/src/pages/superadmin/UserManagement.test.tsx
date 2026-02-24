import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { UserManagement } from "./UserManagement";
import * as superadminApi from "@/api/superadmin";

vi.mock("@/api/superadmin", () => ({
  listUsers: vi.fn(),
  listTenants: vi.fn(),
}));

const mockUsers = [
  { id: "u1", username: "superadmin", email: "admin@platform.dev", tenantId: "", tenantName: "Platform", role: "super_admin" as const, status: "confirmed" as const, lastSignIn: "2026-02-07T08:00:00Z", createdAt: "2024-01-01T00:00:00Z" },
  { id: "u2", username: "bizuser", email: "biz@tenant.in", tenantId: "t-001", tenantName: "GlowUp Salon", role: "tenant_admin" as const, status: "confirmed" as const, lastSignIn: "2026-02-06T00:00:00Z", createdAt: "2025-01-01T00:00:00Z" },
];

const mockTenants = [
  { id: "t-001", name: "GlowUp Salon", slug: "glowup", plan: "growth" as const, billingStatus: "active" as const, memberCount: 1000, programCount: 2, transactionCount: 500, mrr: 3999, createdAt: "2025-01-01T00:00:00Z", contactEmail: "ops@glowup.in" },
];

function renderUserManagement() {
  return render(
    <MemoryRouter>
      <UserManagement />
    </MemoryRouter>
  );
}

describe("UserManagement", () => {
  beforeEach(() => {
    vi.mocked(superadminApi.listUsers).mockResolvedValue(mockUsers);
    vi.mocked(superadminApi.listTenants).mockResolvedValue(mockTenants);
  });

  it("shows loading state initially (positive)", () => {
    renderUserManagement();
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  });

  it("renders heading and user count after load (positive)", async () => {
    renderUserManagement();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /user management/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/2 users/i)).toBeInTheDocument();
  });

  it("renders search and filter controls (positive)", async () => {
    renderUserManagement();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /user management/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("searchbox", { name: /search users/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /filter by tenant/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /filter by role/i })).toBeInTheDocument();
  });

  it("renders user rows with usernames (positive)", async () => {
    renderUserManagement();
    await waitFor(() => {
      expect(screen.getAllByText("superadmin").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("bizuser").length).toBeGreaterThanOrEqual(1);
  });

  it("filters by search (positive)", async () => {
    const user = userEvent.setup();
    renderUserManagement();
    await waitFor(() => {
      expect(screen.getAllByText("superadmin").length).toBeGreaterThanOrEqual(1);
    });
    await user.type(screen.getByRole("searchbox", { name: /search users/i }), "superadmin");
    await waitFor(() => {
      expect(screen.getAllByText("superadmin").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("calls listUsers and listTenants on mount (positive)", async () => {
    renderUserManagement();
    await waitFor(() => {
      expect(superadminApi.listUsers).toHaveBeenCalled();
      expect(superadminApi.listTenants).toHaveBeenCalled();
    });
  });
});
