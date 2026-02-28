import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Billing } from "./Billing";
import { useAuth } from "@/auth/useAuth";
import * as billingApi from "@/api/billing";

vi.mock("@/auth/useAuth");
vi.mock("@/auth/cognito", () => ({ getIdToken: vi.fn().mockResolvedValue("token") }));
vi.mock("@/api/billing");

describe("Billing", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      state: { status: "authenticated", user: { sub: "tenant-1", email: "u@e.com", username: "u", role: "tenant_admin" } },
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      confirmSignUp: vi.fn(),
      refresh: vi.fn(),
    });
    vi.mocked(billingApi.getBillingStatus).mockResolvedValue({
      planId: "growth",
      billingStatus: "active",
      currentPeriodEnd: "2025-03-01",
      razorpaySubscriptionId: "sub_1",
    });
  });

  it("renders billing title and loading then status (positive)", async () => {
    render(<Billing />);
    expect(screen.getByText(/billing/i)).toBeInTheDocument();
    await screen.findByText("growth");
    expect(screen.getByText("growth")).toBeInTheDocument();
  });

  it("shows plan buttons (positive)", async () => {
    render(<Billing />);
    await screen.findByText(/choose plan/i);
    expect(screen.getByRole("button", { name: /starter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /growth/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scale/i })).toBeInTheDocument();
  });

  it("shows error when getBillingStatus fails (negative)", async () => {
    vi.mocked(billingApi.getBillingStatus).mockRejectedValue(new Error("Network error"));
    render(<Billing />);
    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(/network error|failed to load/i);
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
    const { container } = render(<Billing />);
    expect(container.firstChild).toBeNull();
  });

  it("plan selection calls createSubscriptionLink with correct planKey", async () => {
    const user = userEvent.setup();
    vi.mocked(billingApi.createSubscriptionLink).mockResolvedValue({
      shortUrl: "",
      subscriptionId: "sub_new",
    });
    render(<Billing />);
    await screen.findByText("growth");
    await user.click(screen.getByRole("button", { name: /starter.*subscribe/i }));
    expect(billingApi.createSubscriptionLink).toHaveBeenCalledWith(
      "tenant-1",
      { planKey: "starter" },
      expect.anything()
    );
    vi.mocked(billingApi.createSubscriptionLink).mockResolvedValue({
      shortUrl: "",
      subscriptionId: "sub_scale",
    });
    await user.click(screen.getByRole("button", { name: /scale.*subscribe/i }));
    expect(billingApi.createSubscriptionLink).toHaveBeenCalledWith(
      "tenant-1",
      { planKey: "scale" },
      expect.anything()
    );
  });
});
