import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (utils)", () => {
  // Positive: single class
  it("returns single class string", () => {
    expect(cn("foo")).toBe("foo");
  });

  // Positive: multiple classes merged
  it("merges multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  // Positive: tailwind merge – conflicting classes resolved
  it("merges tailwind classes and resolves conflicts", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  // Edge: empty input
  it("handles no arguments", () => {
    expect(cn()).toBe("");
  });

  // Edge: undefined and null
  it("handles undefined and null", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });

  // Edge: conditional object
  it("handles classValue object", () => {
    expect(cn({ "bg-red-500": true, "hidden": false })).toBe("bg-red-500");
  });

  // White-box: mixed inputs
  it("handles mixed string and object inputs", () => {
    expect(cn("base", { active: true }, "extra")).toContain("base");
    expect(cn("base", { active: true }, "extra")).toContain("active");
    expect(cn("base", { active: true }, "extra")).toContain("extra");
  });
});
