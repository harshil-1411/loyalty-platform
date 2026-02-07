import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked (positive)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Submit</Button>);
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled (negative)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Submit</Button>);
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders with variant outline", () => {
    const { container } = render(<Button variant="outline">Out</Button>);
    const btn = container.querySelector("button");
    expect(btn).toHaveClass("border");
  });

  it("forwards ref and type submit", () => {
    render(<Button type="submit">Send</Button>);
    const btn = screen.getByRole("button", { name: /send/i });
    expect(btn).toHaveAttribute("type", "submit");
  });
});
