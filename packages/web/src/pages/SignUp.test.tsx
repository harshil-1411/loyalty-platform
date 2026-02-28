import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SignUp } from "./SignUp";
import { useAuth } from "@/auth/useAuth";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});
vi.mock("@/auth/useAuth");

describe("SignUp", () => {
  const mockSignUp = vi.fn();
  const mockConfirmSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "unauthenticated" },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: mockSignUp,
      confirmSignUp: mockConfirmSignUp,
      refresh: vi.fn(),
    });
  });

  it("renders create account form (positive)", () => {
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
  });

  it("shows link to sign in", () => {
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  });

  it("submits sign up with trimmed username and email (positive)", async () => {
    mockSignUp.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText(/^username$/i), "  joe  ");
    await user.type(screen.getByLabelText(/^email$/i), " joe@example.com ");
    await user.type(screen.getByLabelText(/password/i), "Password1!");
    await user.click(screen.getByRole("button", { name: /sign up/i }));
    expect(mockSignUp).toHaveBeenCalledWith("joe", "joe@example.com", "Password1!");
  });

  it("shows confirmation step after successful sign up (positive)", async () => {
    mockSignUp.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText(/^username$/i), "j");
    await user.type(screen.getByLabelText(/^email$/i), "j@j.com");
    await user.type(screen.getByLabelText(/password/i), "Password1234");
    await user.click(screen.getByRole("button", { name: /sign up/i }));
    await screen.findByRole("heading", { name: /confirm your email/i });
    expect(screen.getByLabelText(/confirmation code/i)).toBeInTheDocument();
  });

  it("shows error when sign up fails (negative)", async () => {
    mockSignUp.mockRejectedValue(new Error("Username exists"));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText(/^username$/i), "x");
    await user.type(screen.getByLabelText(/^email$/i), "x@x.com");
    await user.type(screen.getByLabelText(/password/i), "Password1234");
    await user.click(screen.getByRole("button", { name: /sign up/i }));
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(/sign up failed|username exists/i);
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
        <SignUp />
      </MemoryRouter>
    );
    expect(container.querySelector("form")).not.toBeInTheDocument();
  });
});
