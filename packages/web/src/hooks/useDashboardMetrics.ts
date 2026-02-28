import { useCallback, useEffect, useState } from 'react'
import type { DashboardData } from '@/api/dashboard'
import { getDashboardData } from '@/api/dashboard'
import { getIdToken } from '@/auth/cognito'

export interface UseDashboardMetricsResult {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to load dashboard metrics and chart data.
 * Mock this (or getDashboardData) in tests.
 */
export function useDashboardMetrics(tenantId: string): UseDashboardMetricsResult {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const idToken = await getIdToken()
      const result = await getDashboardData(tenantId, idToken)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
