import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Contact } from "./Contact";

describe("Contact", () => {
  it("renders heading and support info (positive)", () => {
    render(<Contact />);
    expect(screen.getByRole("heading", { name: /contact & support/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /support@loyalty.example.com/i })).toHaveAttribute(
      "href",
      "mailto:support@loyalty.example.com"
    );
    expect(screen.getByRole("link", { name: /\+91 1234567890/i })).toHaveAttribute(
      "href",
      "tel:+911234567890"
    );
  });

  it("mail link is clickable", () => {
    render(<Contact />);
    const mailLink = screen.getByRole("link", { name: /support@loyalty.example.com/i });
    expect(mailLink).toBeInTheDocument();
  });
});
