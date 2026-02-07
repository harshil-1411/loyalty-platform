import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { AuthContext } from "./AuthContext";

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    const ConsoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bad() {
      useAuth();
      return null;
    }
    expect(() => render(<Bad />)).toThrow("useAuth must be used within AuthProvider");
    ConsoleSpy.mockRestore();
  });

  it("returns context value when inside AuthProvider", () => {
    const mockValue = {
      state: { status: "unauthenticated" as const },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    };
    function Consumer() {
      const auth = useAuth();
      return <span data-testid="status">{auth.state.status}</span>;
    }
    render(
      <AuthContext.Provider value={mockValue}>
        <Consumer />
      </AuthContext.Provider>
    );
    expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
  });
});
