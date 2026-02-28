import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Programs } from "./Programs";
import { useAuth } from "@/auth/useAuth";
import * as programsApi from "@/api/programs";

vi.mock("@/auth/useAuth");
vi.mock("@/auth/cognito", () => ({ getIdToken: vi.fn().mockResolvedValue("token") }));
vi.mock("@/api/programs");
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockPrograms = [
  { programId: "p1", name: "Loyalty One", currency: "INR" },
  { programId: "p2", name: "Loyalty Two", currency: "USD" },
];

describe("Programs (CRUD)", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "authenticated", user: { sub: "tenant-1", email: "u@e.com", username: "u", role: "tenant_admin" } },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    vi.mocked(programsApi.listPrograms).mockResolvedValue({ programs: mockPrograms });
    vi.mocked(programsApi.createProgram).mockResolvedValue({
      programId: "p3",
      name: "New Program",
      currency: "INR",
    });
    vi.mocked(programsApi.getProgram).mockResolvedValue({
      programId: "p1",
      name: "Loyalty One",
      currency: "INR",
    });
    vi.mocked(programsApi.updateProgram).mockResolvedValue({
      programId: "p1",
      updatedAt: "2025-01-01T00:00:00Z",
    });
  });

  it("renders list of programs when authenticated", async () => {
    render(<Programs />);
    await screen.findByText("Loyalty One");
    expect(screen.getByText("Loyalty Two")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create program/i })).toBeInTheDocument();
  });

  it("shows empty state when no programs", async () => {
    vi.mocked(programsApi.listPrograms).mockResolvedValue({ programs: [] });
    render(<Programs />);
    await screen.findByText(/no programs yet/i);
  });

  it("shows error when listPrograms fails", async () => {
    vi.mocked(programsApi.listPrograms).mockRejectedValue(new Error("Network error"));
    render(<Programs />);
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(/network error|failed to load/i);
  });

  it("opens create form and creates program", async () => {
    const user = userEvent.setup();
    render(<Programs />);
    await screen.findByText("Loyalty One");
    await user.click(screen.getByRole("button", { name: /create program/i }));
    expect(screen.getByRole("heading", { name: /new program/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^name$/i), "My Program");
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    expect(programsApi.createProgram).toHaveBeenCalledWith(
      "tenant-1",
      { name: "My Program", currency: "INR" },
      expect.anything()
    );
  });

  it("cancel create form returns to list", async () => {
    const user = userEvent.setup();
    render(<Programs />);
    await screen.findByText("Loyalty One");
    await user.click(screen.getByRole("button", { name: /create program/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByText("Loyalty One")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /new program/i })).not.toBeInTheDocument();
  });

  it("opens edit form and saves program", async () => {
    const user = userEvent.setup();
    render(<Programs />);
    await screen.findByText("Loyalty One");
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);
    await screen.findByRole("heading", { name: /edit program/i });
    await user.clear(screen.getByLabelText(/^name$/i));
    await user.type(screen.getByLabelText(/^name$/i), "Updated Name");
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(programsApi.updateProgram).toHaveBeenCalledWith(
      "tenant-1",
      "p1",
      { name: "Updated Name", currency: "INR" },
      expect.anything()
    );
  });

  it("returns null when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "unauthenticated" },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    const { container } = render(<Programs />);
    expect(container.firstChild).toBeNull();
  });
});
