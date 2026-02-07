/**
 * Dashboard metrics and chart data for the Premium Dashboard.
 * Used by useDashboardMetrics; mock this in tests.
 */

export interface DashboardMetrics {
  totalPoints: number
  activePrograms: number
  transactionsCount: number
  rewardsRedeemed: number
}

export interface ChartDataPoint {
  name: string
  value: number
}

export interface DashboardChartData {
  pointsByProgram: ChartDataPoint[]
  transactionsOverTime: ChartDataPoint[]
}

export interface DashboardData {
  metrics: DashboardMetrics
  charts: DashboardChartData
}

const stubData: DashboardData = {
  metrics: {
    totalPoints: 125_000,
    activePrograms: 3,
    transactionsCount: 1_420,
    rewardsRedeemed: 89,
  },
  charts: {
    pointsByProgram: [
      { name: 'Loyalty Plus', value: 52000 },
      { name: 'Rewards Gold', value: 48000 },
      { name: 'Cashback', value: 25000 },
    ],
    transactionsOverTime: [
      { name: 'Mon', value: 210 },
      { name: 'Tue', value: 185 },
      { name: 'Wed', value: 240 },
      { name: 'Thu', value: 198 },
      { name: 'Fri', value: 265 },
      { name: 'Sat', value: 182 },
      { name: 'Sun', value: 140 },
    ],
  },
}

/**
 * Fetches dashboard data for the given tenant.
 * In production this would call the backend API.
 */
export async function getDashboardData(tenantId: string): Promise<DashboardData> {
  // Simulate network delay; in production would use tenantId for API call
  void tenantId
  await new Promise((r) => setTimeout(r, 0))
  return stubData
}
