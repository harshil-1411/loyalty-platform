import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

describe("StatusBadge — billing variant", () => {
  it("renders 'Active' for active status", () => {
    render(<StatusBadge variant="billing" status="active" />);
    expect(screen.getByRole("status")).toHaveTextContent("Active");
  });

  it("renders 'Trialing' for trialing status", () => {
    render(<StatusBadge variant="billing" status="trialing" />);
    expect(screen.getByRole("status")).toHaveTextContent("Trialing");
  });

  it("renders 'Past Due' for past_due status", () => {
    render(<StatusBadge variant="billing" status="past_due" />);
    expect(screen.getByRole("status")).toHaveTextContent("Past Due");
  });

  it("renders 'Cancelled' for cancelled status", () => {
    render(<StatusBadge variant="billing" status="cancelled" />);
    expect(screen.getByRole("status")).toHaveTextContent("Cancelled");
  });

  it("renders 'No Plan' for none status", () => {
    render(<StatusBadge variant="billing" status="none" />);
    expect(screen.getByRole("status")).toHaveTextContent("No Plan");
  });

  it("falls back to raw status for unknown values", () => {
    render(<StatusBadge variant="billing" status="unknown_status" />);
    expect(screen.getByRole("status")).toHaveTextContent("unknown_status");
  });

  it("uses custom label when provided", () => {
    render(<StatusBadge variant="billing" status="active" label="Live" />);
    expect(screen.getByRole("status")).toHaveTextContent("Live");
  });
});

describe("StatusBadge — event variant", () => {
  it("renders 'Created' for created event", () => {
    render(<StatusBadge variant="event" status="created" />);
    expect(screen.getByRole("status")).toHaveTextContent("Created");
  });

  it("renders 'Renewed' for renewed event", () => {
    render(<StatusBadge variant="event" status="renewed" />);
    expect(screen.getByRole("status")).toHaveTextContent("Renewed");
  });

  it("renders 'Trial Started' for trial_started", () => {
    render(<StatusBadge variant="event" status="trial_started" />);
    expect(screen.getByRole("status")).toHaveTextContent("Trial Started");
  });
});

describe("StatusBadge — user variant", () => {
  it("renders 'Confirmed' for CONFIRMED status", () => {
    render(<StatusBadge variant="user" status="CONFIRMED" />);
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
  });

  it("renders 'Pending' for FORCE_CHANGE_PASSWORD", () => {
    render(<StatusBadge variant="user" status="FORCE_CHANGE_PASSWORD" />);
    expect(screen.getByRole("status")).toHaveTextContent("Pending");
  });

  it("renders 'Disabled' for disabled status", () => {
    render(<StatusBadge variant="user" status="disabled" />);
    expect(screen.getByRole("status")).toHaveTextContent("Disabled");
  });
});
