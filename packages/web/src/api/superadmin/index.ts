/**
 * Super-admin API client.
 *
 * Currently returns mock data. When the real backend endpoints exist,
 * swap each function body to call the actual API via `apiGet` / `apiPost`.
 * The return types stay the same — they **are** the API contract.
 */

import type {
  Tenant,
  PlatformMetrics,
  TimeSeriesPoint,
  PlanDistribution,
  PricingPlan,
  SubscriptionEvent,
  PlatformUser,
  Program,
} from './mock-data'

import {
  tenants as mockTenants,
  programs as mockPrograms,
  platformMetrics as mockPlatformMetrics,
  tenantGrowth as mockTenantGrowth,
  revenueTrend as mockRevenueTrend,
  planDistribution as mockPlanDistribution,
  pricingPlans as mockPricingPlans,
  subscriptionEvents as mockSubscriptionEvents,
  users as mockUsers,
} from './mock-data'

/* ---- helpers ---- */

/** Simulate network latency */
function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

/* ------------------------------------------------------------------ */
/*  Platform overview                                                 */
/* ------------------------------------------------------------------ */

export function getPlatformMetrics(): Promise<PlatformMetrics> {
  return delay(mockPlatformMetrics)
}

export function getTenantGrowthSeries(): Promise<TimeSeriesPoint[]> {
  return delay(mockTenantGrowth)
}

export function getRevenueTrendSeries(): Promise<TimeSeriesPoint[]> {
  return delay(mockRevenueTrend)
}

export function getPlanDistribution(): Promise<PlanDistribution[]> {
  return delay(mockPlanDistribution)
}

/* ------------------------------------------------------------------ */
/*  Tenants                                                           */
/* ------------------------------------------------------------------ */

export interface TenantFilters {
  search?: string
  plan?: string | null
  status?: string | null
}

export function listTenants(filters?: TenantFilters): Promise<Tenant[]> {
  let results = [...mockTenants]
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    results = results.filter(
      (t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    )
  }
  if (filters?.plan) {
    results = results.filter((t) => (filters.plan === 'none' ? t.plan === null : t.plan === filters.plan))
  }
  if (filters?.status) {
    results = results.filter((t) => t.billingStatus === filters.status)
  }
  return delay(results)
}

export function getTenantDetail(tenantId: string): Promise<Tenant | undefined> {
  return delay(mockTenants.find((t) => t.id === tenantId))
}

export function getTenantPrograms(tenantId: string): Promise<Program[]> {
  return delay(mockPrograms.filter((p) => p.tenantId === tenantId))
}

/* ------------------------------------------------------------------ */
/*  Pricing plans                                                     */
/* ------------------------------------------------------------------ */

export function listPricingPlans(): Promise<PricingPlan[]> {
  return delay(mockPricingPlans)
}

/* ------------------------------------------------------------------ */
/*  Billing                                                           */
/* ------------------------------------------------------------------ */

export function getSubscriptionEvents(): Promise<SubscriptionEvent[]> {
  return delay(mockSubscriptionEvents)
}

/* ------------------------------------------------------------------ */
/*  Users                                                             */
/* ------------------------------------------------------------------ */

export interface UserFilters {
  search?: string
  tenantId?: string | null
  role?: string | null
}

export function listUsers(filters?: UserFilters): Promise<PlatformUser[]> {
  let results = [...mockUsers]
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    results = results.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    )
  }
  if (filters?.tenantId) {
    results = results.filter((u) => u.tenantId === filters.tenantId)
  }
  if (filters?.role) {
    results = results.filter((u) => u.role === filters.role)
  }
  return delay(results)
}

/* ---- re-export types for convenience ---- */
export type {
  Tenant,
  PlatformMetrics,
  TimeSeriesPoint,
  PlanDistribution,
  PricingPlan,
  SubscriptionEvent,
  PlatformUser,
  Program,
  PlanKey,
  BillingStatus,
} from './mock-data'
