import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDashboardData } from "./dashboard";

describe("getDashboardData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("returns dashboard data for tenant", async () => {
    const p = getDashboardData("tenant-1");
    await vi.runAllTimersAsync();
    const data = await p;
    expect(data.metrics).toBeDefined();
    expect(data.metrics.totalPoints).toBe(125_000);
    expect(data.charts.pointsByProgram).toHaveLength(3);
  });

  it("returns same structure for different tenant ids", async () => {
    const a = getDashboardData("t1");
    const b = getDashboardData("t2");
    await vi.runAllTimersAsync();
    const [da, db] = await Promise.all([a, b]);
    expect(da.metrics.totalPoints).toBe(db.metrics.totalPoints);
  });
});
