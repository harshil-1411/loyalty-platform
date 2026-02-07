import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";

describe("Card (white-box: structure)", () => {
  it("renders Card with content", () => {
    render(<Card>Inner</Card>);
    expect(screen.getByText("Inner")).toBeInTheDocument();
  });

  it("renders CardHeader and CardTitle", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByRole("heading", { name: /title/i })).toBeInTheDocument();
  });

  it("renders CardDescription", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>T</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText("Desc")).toBeInTheDocument();
  });

  it("renders CardContent and CardFooter", () => {
    render(
      <Card>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });
});
