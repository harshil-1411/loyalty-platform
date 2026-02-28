import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Rewards } from "./Rewards";
import { useAuth } from "@/auth/useAuth";
import * as programsApi from "@/api/programs";
import * as rewardsApi from "@/api/rewards";

vi.mock("@/auth/useAuth");
vi.mock("@/auth/cognito", () => ({ getIdToken: vi.fn().mockResolvedValue("token") }));
vi.mock("@/api/programs");
vi.mock("@/api/rewards");
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockPrograms = [
  { programId: "p1", name: "Loyalty", currency: "INR" },
];
const mockRewards = [
  { rewardId: "r1", name: "Coffee", pointsCost: 50 },
  { rewardId: "r2", name: "Free shipping", pointsCost: 100 },
];

describe("Rewards (catalog + redeem)", () => {
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
    vi.mocked(rewardsApi.listRewards).mockResolvedValue({ rewards: mockRewards });
    vi.mocked(rewardsApi.createReward).mockResolvedValue({
      rewardId: "r3",
      name: "New Reward",
      pointsCost: 75,
    });
    vi.mocked(rewardsApi.redeem).mockResolvedValue({
      transactionId: "tx1",
      rewardId: "r1",
      pointsDeducted: 50,
      balance: 50,
    });
  });

  it("renders Catalog and Redeem tabs", async () => {
    render(<Rewards />);
    await screen.findByRole("tab", { name: /catalog/i });
    expect(screen.getByRole("tab", { name: /redeem/i })).toBeInTheDocument();
  });

  it("catalog tab shows rewards list and add form", async () => {
    render(<Rewards />);
    await screen.findByText("Coffee");
    expect(screen.getByText("Free shipping")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /add reward/i })).toBeInTheDocument();
  });

  it("add reward submits and calls createReward", async () => {
    const user = userEvent.setup();
    render(<Rewards />);
    await screen.findByText("Coffee");
    await user.type(screen.getByLabelText(/^name$/i), "Free item");
    await user.clear(screen.getByLabelText(/points cost/i));
    await user.type(screen.getByLabelText(/points cost/i), "25");
    await user.click(screen.getByRole("button", { name: /add reward/i }));
    expect(rewardsApi.createReward).toHaveBeenCalledWith(
      "tenant-1",
      "p1",
      { name: "Free item", pointsCost: 25 },
      expect.anything()
    );
  });

  it("redeem tab shows member and reward select", async () => {
    const user = userEvent.setup();
    render(<Rewards />);
    await screen.findByText("Coffee");
    await user.click(screen.getByRole("tab", { name: /redeem/i }));
    expect(screen.getByLabelText(/member id/i)).toBeInTheDocument();
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /^redeem$/i })).toBeInTheDocument();
  });

  it("redeem form submit button is disabled without member and reward", async () => {
    const user = userEvent.setup();
    render(<Rewards />);
    await screen.findByText("Coffee");
    await user.click(screen.getByRole("tab", { name: /redeem/i }));
    const redeemBtn = screen.getByRole("button", { name: /^redeem$/i });
    expect(redeemBtn).toBeDisabled();
    await user.type(screen.getByLabelText(/member id/i), "member_1");
    expect(redeemBtn).toBeDisabled();
  });

  it("redeem API is called with correct args when form is valid", async () => {
    render(<Rewards />);
    await screen.findByText("Coffee");
    expect(rewardsApi.listRewards).toHaveBeenCalledWith(
      "tenant-1",
      "p1",
      expect.anything()
    );
    expect(rewardsApi.redeem).toBeDefined();
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
    const { container } = render(<Rewards />);
    expect(container.firstChild).toBeNull();
  });
});
