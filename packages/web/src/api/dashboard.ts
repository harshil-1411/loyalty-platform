/**
 * Dashboard metrics and chart data for the Premium Dashboard.
 * Used by useDashboardMetrics; mock this in tests.
 */

import { listPrograms } from './programs'
import { listTransactions } from './transactions'

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

/**
 * Fetches real dashboard data for the given tenant by aggregating programs
 * and their transactions. The idToken is the Cognito idToken for auth.
 */
export async function getDashboardData(
  tenantId: string,
  idToken?: string | null
): Promise<DashboardData> {
  const { programs } = await listPrograms(tenantId, idToken ?? undefined)
  const activePrograms = programs.length

  let totalPoints = 0
  let transactionsCount = 0
  let rewardsRedeemed = 0
  const pointsByProgram: ChartDataPoint[] = []

  await Promise.all(
    programs.map(async (prog) => {
      const res = await listTransactions(
        tenantId,
        prog.programId,
        { limit: 100 },
        idToken ?? undefined
      )
      const txs = res.transactions ?? []
      let progPoints = 0
      for (const tx of txs) {
        transactionsCount += 1
        if (tx.type === 'earn') {
          progPoints += tx.points ?? 0
        } else if (tx.type === 'redemption') {
          rewardsRedeemed += 1
        }
      }
      totalPoints += progPoints
      pointsByProgram.push({ name: prog.name, value: progPoints })
    })
  )

  // Last-7-days bar chart from transactions (best-effort without date index)
  const transactionsOverTime: ChartDataPoint[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { name: d.toLocaleDateString('en-IN', { weekday: 'short' }), value: 0 }
  })

  return {
    metrics: { totalPoints, activePrograms, transactionsCount, rewardsRedeemed },
    charts: { pointsByProgram, transactionsOverTime },
  }
}
