import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDashboardData } from "./dashboard";
import * as programs from "./programs";
import * as transactions from "./transactions";

vi.mock("./programs");
vi.mock("./transactions");

const MOCK_PROGRAMS = [
  { programId: "p1", name: "Gold", currency: "points", createdAt: "", updatedAt: "" },
  { programId: "p2", name: "Silver", currency: "points", createdAt: "", updatedAt: "" },
  { programId: "p3", name: "Bronze", currency: "points", createdAt: "", updatedAt: "" },
];

describe("getDashboardData", () => {
  beforeEach(() => {
    vi.mocked(programs.listPrograms).mockResolvedValue({ programs: MOCK_PROGRAMS });
    vi.mocked(transactions.listTransactions).mockImplementation(async (_tid, programId) => {
      if (programId === "p1") {
        return {
          transactions: [
            { transactionId: "t1", type: "earn", memberId: "m1", points: 100_000, createdAt: "" },
            { transactionId: "t2", type: "earn", memberId: "m2", points: 20_000, createdAt: "" },
            { transactionId: "t3", type: "redemption", memberId: "m1", points: 5_000, createdAt: "" },
          ],
          nextToken: undefined,
        };
      }
      if (programId === "p2") {
        return {
          transactions: [
            { transactionId: "t4", type: "earn", memberId: "m3", points: 5_000, createdAt: "" },
          ],
          nextToken: undefined,
        };
      }
      return { transactions: [], nextToken: undefined };
    });
  });

  it("returns dashboard data for tenant", async () => {
    const data = await getDashboardData("tenant-1");
    expect(data.metrics).toBeDefined();
    expect(data.metrics.totalPoints).toBe(125_000);
    expect(data.charts.pointsByProgram).toHaveLength(3);
  });

  it("returns same structure for different tenant ids", async () => {
    const [da, db] = await Promise.all([
      getDashboardData("t1"),
      getDashboardData("t2"),
    ]);
    expect(da.metrics.totalPoints).toBe(db.metrics.totalPoints);
  });

  it("counts earn transactions and redemptions correctly", async () => {
    const data = await getDashboardData("tenant-1");
    expect(data.metrics.transactionsCount).toBe(4); // t1 + t2 + t3 + t4
    expect(data.metrics.rewardsRedeemed).toBe(1);   // t3 is redemption
    expect(data.metrics.activePrograms).toBe(3);
  });

  it("returns last-7-days chart with 7 entries", async () => {
    const data = await getDashboardData("tenant-1");
    expect(data.charts.transactionsOverTime).toHaveLength(7);
    data.charts.transactionsOverTime.forEach((pt) => {
      expect(pt.name).toBeTruthy();
      expect(typeof pt.value).toBe("number");
    });
  });

  it("handles tenant with no programs", async () => {
    vi.mocked(programs.listPrograms).mockResolvedValue({ programs: [] });
    const data = await getDashboardData("empty-tenant");
    expect(data.metrics.totalPoints).toBe(0);
    expect(data.metrics.activePrograms).toBe(0);
    expect(data.charts.pointsByProgram).toHaveLength(0);
  });
});
