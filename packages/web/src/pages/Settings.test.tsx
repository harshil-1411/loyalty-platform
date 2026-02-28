import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Settings, getEffectiveTenantId } from "./Settings";
import { useAuth } from "@/auth/useAuth";

const { mockNavigate, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock("@/auth/useAuth");
vi.mock("@/auth/cognito", () => ({
  getIdToken: vi.fn().mockResolvedValue("test-id-token"),
  changePassword: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn(),
}));
vi.mock("@/api/me", () => ({
  setMyTenant: vi.fn().mockResolvedValue({ tenantId: "new-tenant", updated: true }),
}));
vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
  Toaster: () => null,
}));

const mockAuthUser = {
  sub: "user-sub-1",
  email: "user@example.com",
  username: "testuser",
  custom_tenant_id: "acme-corp",
  role: "tenant_admin" as const,
};

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>
  );
}

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "authenticated", user: mockAuthUser },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it("renders the settings page with current tenant (positive)", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText(/acme-corp/)).toBeInTheDocument();
  });

  it("shows 'default' when user has no custom_tenant_id", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: "authenticated",
        user: { ...mockAuthUser, custom_tenant_id: undefined },
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    renderSettings();
    expect(screen.getByText(/default/i)).toBeInTheDocument();
  });

  it("returns null when unauthenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "unauthenticated" },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    const { container } = renderSettings();
    expect(container.firstChild).toBeNull();
  });

  it("shows error toast when tenant ID is empty (negative)", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /set tenant/i }));
    expect(mockToastError).toHaveBeenCalled();
  });

  it("submits tenant form and calls setMyTenant (positive)", async () => {
    const { setMyTenant } = await import("@/api/me");
    const user = userEvent.setup();
    renderSettings();
    await user.type(screen.getByLabelText(/tenant id/i), "new-tenant");
    await user.click(screen.getByRole("button", { name: /set tenant/i }));
    await waitFor(() => expect(setMyTenant).toHaveBeenCalled());
  });

  it("shows error toast when setMyTenant fails (negative)", async () => {
    const { setMyTenant } = await import("@/api/me");
    vi.mocked(setMyTenant).mockRejectedValueOnce(new Error("Server error"));
    const user = userEvent.setup();
    renderSettings();
    await user.type(screen.getByLabelText(/tenant id/i), "bad-tenant");
    await user.click(screen.getByRole("button", { name: /set tenant/i }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
  });

  it("renders the Change Password section", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
  });

  it("shows error toast when password fields are empty (negative)", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /change password/i }));
    expect(mockToastError).toHaveBeenCalled();
  });

  it("calls changePassword and shows success (positive)", async () => {
    const { changePassword } = await import("@/auth/cognito");
    const user = userEvent.setup();
    renderSettings();
    await user.type(screen.getByLabelText(/current password/i), "OldPass123");
    await user.type(screen.getByLabelText(/new password/i), "NewPass456");
    await user.click(screen.getByRole("button", { name: /change password/i }));
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith("OldPass123", "NewPass456"));
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled());
  });

  it("shows error toast when changePassword fails (negative)", async () => {
    const { changePassword } = await import("@/auth/cognito");
    vi.mocked(changePassword).mockRejectedValueOnce(new Error("Incorrect password"));
    const user = userEvent.setup();
    renderSettings();
    await user.type(screen.getByLabelText(/current password/i), "wrong");
    await user.type(screen.getByLabelText(/new password/i), "new");
    await user.click(screen.getByRole("button", { name: /change password/i }));
    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
  });

  it("sign out button calls signOut and navigates to /login", async () => {
    const { signOut } = await import("@/auth/cognito");
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});

describe("getEffectiveTenantId", () => {
  it("returns custom_tenant_id when set", () => {
    expect(getEffectiveTenantId({ custom_tenant_id: "acme", sub: "s1" })).toBe("acme");
  });

  it("returns 'default' when custom_tenant_id is empty string", () => {
    expect(getEffectiveTenantId({ custom_tenant_id: "", sub: "s1" })).toBe("default");
  });

  it("returns 'default' when custom_tenant_id is undefined", () => {
    expect(getEffectiveTenantId({ sub: "s1" })).toBe("default");
  });

  it("trims whitespace before checking", () => {
    expect(getEffectiveTenantId({ custom_tenant_id: "   ", sub: "s1" })).toBe("default");
  });
});
