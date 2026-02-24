import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SuperAdminGuard } from "./SuperAdminGuard";
import { useAuth } from "@/auth/useAuth";

vi.mock("@/auth/useAuth");

vi.mock("./SuperAdminShell", () => ({
  SuperAdminShell: () => <div data-testid="super-admin-shell">Super Admin Shell</div>,
}));

function renderGuard(initialEntry = "/admin") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin" element={<SuperAdminGuard />} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Tenant dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("SuperAdminGuard", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "loading" },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it("shows loading when status is loading (positive)", () => {
    renderGuard();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByTestId("super-admin-shell")).not.toBeInTheDocument();
  });

  it("shows auth not configured when status is disabled (positive)", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "disabled", reason: "Auth not configured" },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    renderGuard();
    expect(screen.getByText(/auth not configured/i)).toBeInTheDocument();
    expect(screen.getByText(/VITE_SUPER_ADMIN_MODE/i)).toBeInTheDocument();
    expect(screen.queryByTestId("super-admin-shell")).not.toBeInTheDocument();
  });

  it("redirects to /login when unauthenticated (positive)", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "unauthenticated" },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    renderGuard();
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByTestId("super-admin-shell")).not.toBeInTheDocument();
  });

  it("redirects to / when authenticated but role is tenant_admin (positive)", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: "authenticated",
        user: {
          sub: "u1",
          username: "user",
          email: "u@e.com",
          role: "tenant_admin",
        },
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    renderGuard();
    expect(screen.getByText("Tenant dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("super-admin-shell")).not.toBeInTheDocument();
  });

  it("renders SuperAdminShell when authenticated and role is super_admin (positive)", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: "authenticated",
        user: {
          sub: "sa-1",
          username: "superadmin",
          email: "admin@platform.dev",
          role: "super_admin",
        },
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    renderGuard();
    expect(screen.getByTestId("super-admin-shell")).toBeInTheDocument();
    expect(screen.getByText("Super Admin Shell")).toBeInTheDocument();
  });
});
