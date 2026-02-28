import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Transactions } from "./Transactions";
import { useAuth } from "@/auth/useAuth";
import * as programsApi from "@/api/programs";
import * as transactionsApi from "@/api/transactions";

vi.mock("@/auth/useAuth");
vi.mock("@/auth/cognito", () => ({ getIdToken: vi.fn().mockResolvedValue("token") }));
vi.mock("@/api/programs");
vi.mock("@/api/transactions");

const mockPrograms = [
  { programId: "p1", name: "Loyalty", currency: "INR" },
];

describe("Transactions (earn/burn)", () => {
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
    vi.mocked(transactionsApi.getBalance).mockResolvedValue({
      memberId: "m1",
      programId: "p1",
      balance: 100,
    });
    vi.mocked(transactionsApi.earn).mockResolvedValue({
      transactionId: "tx1",
      balance: 110,
      points: 10,
    });
    vi.mocked(transactionsApi.burn).mockResolvedValue({
      transactionId: "tx2",
      balance: 90,
      points: 10,
    });
    vi.mocked(transactionsApi.listTransactions).mockResolvedValue({
      transactions: [],
      nextToken: null,
    });
  });

  it("renders program select and member ID input when programs loaded", async () => {
    render(<Transactions />);
    await screen.findByText(/balance & transactions/i);
    await screen.findByRole("combobox");
    expect(screen.getByPlaceholderText(/member_123|user sub/i)).toBeInTheDocument();
  });

  it("shows balance when member ID entered", async () => {
    const user = userEvent.setup();
    render(<Transactions />);
    await screen.findByRole("combobox");
    await user.type(screen.getByPlaceholderText(/member_123|user sub/i), "member_1");
    await screen.findByText(/100 points/i);
  });

  it("earn form submits and updates balance", async () => {
    const user = userEvent.setup();
    render(<Transactions />);
    await screen.findByRole("combobox");
    await user.type(screen.getByPlaceholderText(/member_123|user sub/i), "member_1");
    await screen.findByText(/100 points/i);
    const spinbuttons = screen.getAllByRole("spinbutton");
    await user.clear(spinbuttons[0]);
    await user.type(spinbuttons[0], "10");
    await user.click(screen.getByRole("button", { name: /^earn$/i }));
    expect(transactionsApi.earn).toHaveBeenCalledWith(
      "tenant-1",
      "p1",
      { memberId: "member_1", points: 10 },
      expect.anything()
    );
  });

  it("burn form submits and updates balance", async () => {
    const user = userEvent.setup();
    render(<Transactions />);
    await screen.findByRole("combobox");
    await user.type(screen.getByPlaceholderText(/member_123|user sub/i), "member_1");
    await screen.findByText(/100 points/i);
    await user.click(screen.getByRole("button", { name: /^burn$/i }));
    expect(transactionsApi.burn).toHaveBeenCalledWith(
      "tenant-1",
      "p1",
      { memberId: "member_1", points: 5 },
      expect.anything()
    );
  });

  it("shows error when getBalance fails", async () => {
    vi.mocked(transactionsApi.getBalance).mockRejectedValue(new Error("Not found"));
    const user = userEvent.setup();
    render(<Transactions />);
    await screen.findByRole("combobox");
    await user.type(screen.getByPlaceholderText(/member_123|user sub/i), "member_1");
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(/not found|failed to load balance/i);
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
    const { container } = render(<Transactions />);
    expect(container.firstChild).toBeNull();
  });

  it("displays transaction history with type filter when transactions exist", async () => {
    vi.mocked(transactionsApi.listTransactions).mockResolvedValue({
      transactions: [
        { transactionId: "t1", type: "earn", memberId: "m1", points: 10, createdAt: "2025-01-01T12:00:00Z" },
        { transactionId: "t2", type: "burn", memberId: "m1", points: 5, createdAt: "2025-01-02T12:00:00Z" },
        { transactionId: "t3", type: "earn", memberId: "m1", points: 20, createdAt: "2025-01-03T12:00:00Z" },
      ],
      nextToken: null,
    });
    const user = userEvent.setup();
    render(<Transactions />);
    await screen.findByRole("combobox");
    await user.type(screen.getByPlaceholderText(/member_123|user sub/i), "member_1");
    await screen.findByText(/transaction history/i);
    expect(screen.getByRole("combobox", { name: /filter by type/i })).toBeInTheDocument();
    const grid = screen.getByRole("grid", { name: /transaction history/i });
    expect(grid).toBeInTheDocument();
    within(grid).getByText(/\+10/);
    within(grid).getByText(/\+20/);
    within(grid).getByText(/-5/);
  });
});
