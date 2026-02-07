import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "./Dashboard";
import { useAuth } from "@/auth/useAuth";

vi.mock("@/auth/useAuth");

describe("Dashboard", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "authenticated", user: { sub: "1", email: "u@e.com", username: "u" } },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it("renders when authenticated (positive)", () => {
    render(<Dashboard />);
    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/tenant context/i)).toBeInTheDocument();
    expect(screen.getByText("u@e.com")).toBeInTheDocument();
  });

  it("returns null when not authenticated (negative)", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "unauthenticated" },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    const { container } = render(<Dashboard />);
    expect(container.firstChild).toBeNull();
  });

  it("shows username when email is missing (edge)", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "authenticated", user: { sub: "1", email: undefined, username: "john" } },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    const { container } = render(<Dashboard />);
    expect(container.textContent).toContain("john");
  });
});
