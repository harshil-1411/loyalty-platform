/**
 * Smoke tests: critical paths render without throwing.
 * Run first to catch regressions that break the app.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { Contact } from "@/pages/Contact";
import { Login } from "@/pages/Login";
import { SignUp } from "@/pages/SignUp";
import { useAuth } from "@/auth/useAuth";

vi.mock("@/auth/useAuth");

describe("Smoke tests", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "unauthenticated" },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it("Login page loads", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("SignUp page loads", () => {
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
  });

  it("Contact page loads", () => {
    render(<Contact />);
    expect(screen.getByRole("heading", { name: /contact/i })).toBeInTheDocument();
  });

  it("Dashboard loads when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "authenticated", user: { sub: "1", email: "a@b.com", username: "a" } },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    render(<Dashboard />);
    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
  });

});
