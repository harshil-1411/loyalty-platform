import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Login } from "./Login";
import { useAuth } from "@/auth/useAuth";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock("@/auth/useAuth");

describe("Login", () => {
  const mockSignIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "unauthenticated" },
      signIn: mockSignIn,
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
  });

  function renderLogin() {
    return render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
  }

  it("renders sign in form (positive)", () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows link to sign up", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute("href", "/signup");
  });

  it("submits with username and password (positive)", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/username or email/i), "testuser");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(mockSignIn).toHaveBeenCalledWith("testuser", "password123");
  });

  it("trims username (edge)", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/username or email/i), "  user  ");
    await user.type(screen.getByLabelText(/password/i), "pass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(mockSignIn).toHaveBeenCalledWith("user", "pass");
  });

  it("shows error when signIn rejects (negative)", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"));
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/username or email/i), "u");
    await user.type(screen.getByLabelText(/password/i), "p");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(/invalid credentials|sign in failed/i);
  });

  it("returns null when already authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "authenticated", user: { sub: "1", email: "a@b.com", username: "a", role: "tenant_admin" } },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(container.querySelector("form")).not.toBeInTheDocument();
  });
});
