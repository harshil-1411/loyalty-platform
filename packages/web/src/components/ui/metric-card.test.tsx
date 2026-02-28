import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MetricCard } from "./metric-card";
import { Users } from "lucide-react";

function renderCard(props: Parameters<typeof MetricCard>[0]) {
  return render(
    <MemoryRouter>
      <MetricCard {...props} />
    </MemoryRouter>
  );
}

describe("MetricCard", () => {
  it("renders title and value", () => {
    renderCard({ title: "Total Users", value: "1,234" });
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders optional sub text", () => {
    renderCard({ title: "MRR", value: "₹50k", sub: "per month" });
    expect(screen.getByText("per month")).toBeInTheDocument();
  });

  it("renders optional change text", () => {
    renderCard({ title: "Growth", value: "42", change: "+12%" });
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    const { container } = renderCard({ title: "Users", value: "100", icon: Users });
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders as a link when 'to' and 'linkLabel' are provided", () => {
    renderCard({ title: "Programs", value: "5", to: "/programs", linkLabel: "Go to programs" });
    expect(screen.getByRole("link", { name: /go to programs/i })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/programs");
  });

  it("renders as plain card (no link) when 'to' is not provided", () => {
    const { container } = renderCard({ title: "Stats", value: "10" });
    expect(container.querySelector("a")).not.toBeInTheDocument();
  });

  it("applies warn style variant without crashing", () => {
    expect(() => renderCard({ title: "Warning", value: "3", warn: true, icon: Users })).not.toThrow();
  });

  it("renders positive change text", () => {
    renderCard({ title: "Growth", value: "10", change: "+5%", positive: true });
    expect(screen.getByText("+5%")).toBeInTheDocument();
  });

  it("renders negative change text", () => {
    renderCard({ title: "Churn", value: "2", change: "-1%", negative: true });
    expect(screen.getByText("-1%")).toBeInTheDocument();
  });
});
