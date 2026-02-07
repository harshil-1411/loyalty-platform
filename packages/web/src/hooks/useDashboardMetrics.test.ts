import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDashboardMetrics } from "./useDashboardMetrics";
import * as dashboardApi from "@/api/dashboard";

vi.mock("@/api/dashboard", () => ({
  getDashboardData: vi.fn(),
}));

describe("useDashboardMetrics", () => {
  beforeEach(() => {
    vi.mocked(dashboardApi.getDashboardData).mockClear();
    vi.mocked(dashboardApi.getDashboardData).mockResolvedValue({
      metrics: { totalPoints: 100, activePrograms: 1, transactionsCount: 10, rewardsRedeemed: 2 },
      charts: { pointsByProgram: [], transactionsOverTime: [] },
    });
  });

  it("starts with loading true and no data", () => {
    const { result } = renderHook(() => useDashboardMetrics("tenant-1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("returns data after fetch (positive)", async () => {
    const { result } = renderHook(() => useDashboardMetrics("tenant-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data?.metrics.totalPoints).toBe(100);
    expect(result.current.error).toBeNull();
  });

  it("sets error on fetch failure (negative)", async () => {
    vi.mocked(dashboardApi.getDashboardData).mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useDashboardMetrics("tenant-1"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe("Network error");
    expect(result.current.data).toBeNull();
  });

  it("does not fetch when tenantId is empty (edge)", async () => {
    const { result } = renderHook(() => useDashboardMetrics(""));
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
    });
    expect(dashboardApi.getDashboardData).not.toHaveBeenCalled();
  });
});
