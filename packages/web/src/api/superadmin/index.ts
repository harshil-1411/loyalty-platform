/**
 * Super-admin API client.
 *
 * - devMode (VITE_SUPER_ADMIN_MODE=true): returns mock data, no real API calls.
 * - production mode: calls the real backend endpoints with the Cognito idToken.
 *
 * The return types are the API contract — shapes must match backend models/superadmin.py.
 */

import { config } from '../../config'
import { getIdToken } from '../../auth/cognito'
import { apiGet, apiPost, apiPatch } from '../client'
import type {
  Tenant,
  PlatformMetrics,
  TimeSeriesPoint,
  PlanDistribution,
  PricingPlan,
  SubscriptionEvent,
  AuditLogEntry,
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
  auditLog as mockAuditLog,
  users as mockUsers,
} from './mock-data'

export type { AuditLogEntry }

export interface CreateTenantData {
  name: string
  slug: string
  contactEmail: string
  planId?: string | null
  adminEmail?: string | null
  adminUsername?: string | null
}

export interface CreateTenantResult {
  tenantId: string
  name: string
  adminCreated: boolean
}

/* ---- helpers ---- */

const isDev = config.superAdmin.devMode

/** Simulate network latency (dev / mock mode only). */
function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

/**
 * Authenticated GET request to a super-admin backend endpoint.
 * Passes the Cognito idToken via Authorization header; X-Tenant-Id is empty
 * because super-admin endpoints are cross-tenant.
 */
async function adminGet<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const token = await getIdToken()
  let fullPath = `/api/v1/admin${path}`
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
      .join('&')
    if (qs) fullPath = `${fullPath}?${qs}`
  }
  // tenantId is intentionally empty — super-admin endpoints don't use X-Tenant-Id
  return apiGet<T>(fullPath, '', token)
}

/** Authenticated POST request (no request body needed for simple action endpoints). */
async function adminPost<T = void>(path: string, body?: unknown): Promise<T> {
  const token = await getIdToken()
  return apiPost<T>(`/api/v1/admin${path}`, '', body ?? {}, token)
}

/** Authenticated PATCH request. */
async function adminPatch<T = void>(path: string, body: unknown): Promise<T> {
  const token = await getIdToken()
  return apiPatch<T>(`/api/v1/admin${path}`, '', body, token)
}

/* ------------------------------------------------------------------ */
/*  Platform overview                                                  */
/* ------------------------------------------------------------------ */

export function getPlatformMetrics(): Promise<PlatformMetrics> {
  if (isDev) return delay(mockPlatformMetrics)
  return adminGet<PlatformMetrics>('/metrics')
}

export async function getTenantGrowthSeries(): Promise<TimeSeriesPoint[]> {
  if (isDev) return delay(mockTenantGrowth)
  const res = await adminGet<{ points: TimeSeriesPoint[] }>('/metrics/tenant-growth')
  return res.points
}

export async function getRevenueTrendSeries(): Promise<TimeSeriesPoint[]> {
  if (isDev) return delay(mockRevenueTrend)
  const res = await adminGet<{ points: TimeSeriesPoint[] }>('/metrics/revenue-trend')
  return res.points
}

export async function getPlanDistribution(): Promise<PlanDistribution[]> {
  if (isDev) return delay(mockPlanDistribution)
  const res = await adminGet<{ plans: PlanDistribution[] }>('/plans')
  return res.plans
}

/* ------------------------------------------------------------------ */
/*  Tenants                                                            */
/* ------------------------------------------------------------------ */

export interface TenantFilters {
  search?: string
  plan?: string | null
  status?: string | null
}

export async function listTenants(filters?: TenantFilters): Promise<Tenant[]> {
  if (isDev) {
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
  const res = await adminGet<{ tenants: Tenant[] }>('/tenants', {
    search: filters?.search ?? undefined,
    plan: filters?.plan ?? undefined,
    status: filters?.status ?? undefined,
  })
  return res.tenants
}

export async function getTenantDetail(tenantId: string): Promise<Tenant | undefined> {
  if (isDev) return delay(mockTenants.find((t) => t.id === tenantId))
  try {
    const res = await adminGet<{ tenant: Tenant; programs: Program[] }>(`/tenants/${encodeURIComponent(tenantId)}`)
    return res.tenant
  } catch {
    return undefined
  }
}

export async function getTenantPrograms(tenantId: string): Promise<Program[]> {
  if (isDev) return delay(mockPrograms.filter((p) => p.tenantId === tenantId))
  return adminGet<Program[]>(`/tenants/${encodeURIComponent(tenantId)}/programs`)
}

/* ------------------------------------------------------------------ */
/*  Pricing plans                                                      */
/* ------------------------------------------------------------------ */

/**
 * Pricing plans are static config — no backend endpoint.
 * Returns mock data in all modes.
 */
export function listPricingPlans(): Promise<PricingPlan[]> {
  return delay(mockPricingPlans)
}

/* ------------------------------------------------------------------ */
/*  Billing                                                            */
/* ------------------------------------------------------------------ */

export async function getSubscriptionEvents(): Promise<SubscriptionEvent[]> {
  if (isDev) return delay(mockSubscriptionEvents)
  const res = await adminGet<{ events: SubscriptionEvent[] }>('/billing/events')
  return res.events
}

/* ------------------------------------------------------------------ */
/*  Users                                                              */
/* ------------------------------------------------------------------ */

export interface UserFilters {
  search?: string
  tenantId?: string | null
  role?: string | null
}

export async function listUsers(filters?: UserFilters): Promise<PlatformUser[]> {
  if (isDev) {
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
  const res = await adminGet<{ users: PlatformUser[] }>('/users', {
    search: filters?.search ?? undefined,
    tenantId: filters?.tenantId ?? undefined,
    role: filters?.role ?? undefined,
  })
  return res.users
}

/* ------------------------------------------------------------------ */
/*  User actions                                                       */
/* ------------------------------------------------------------------ */

export async function disableUser(username: string): Promise<void> {
  if (isDev) return delay(undefined)
  await adminPost(`/users/${encodeURIComponent(username)}/disable`)
}

export async function enableUser(username: string): Promise<void> {
  if (isDev) return delay(undefined)
  await adminPost(`/users/${encodeURIComponent(username)}/enable`)
}

export async function resetUserPassword(username: string): Promise<void> {
  if (isDev) return delay(undefined)
  await adminPost(`/users/${encodeURIComponent(username)}/reset-password`)
}

/* ------------------------------------------------------------------ */
/*  Tenant actions                                                     */
/* ------------------------------------------------------------------ */

export async function changeTenantPlan(tenantId: string, plan: string | null): Promise<void> {
  if (isDev) return delay(undefined)
  await adminPatch(`/tenants/${encodeURIComponent(tenantId)}/plan`, { plan })
}

export async function changeTenantStatus(tenantId: string, status: string): Promise<void> {
  if (isDev) return delay(undefined)
  await adminPatch(`/tenants/${encodeURIComponent(tenantId)}/status`, { status })
}

/* ------------------------------------------------------------------ */
/*  Audit log                                                         */
/* ------------------------------------------------------------------ */

export async function getAuditLog(tenantId?: string, limit = 50): Promise<AuditLogEntry[]> {
  if (isDev) {
    const filtered = tenantId
      ? mockAuditLog.filter((e) => e.targetId === tenantId)
      : mockAuditLog
    return delay(filtered.slice(0, limit))
  }
  const res = await adminGet<{ entries: AuditLogEntry[] }>('/audit-log', {
    tenantId: tenantId ?? undefined,
    limit: String(limit),
  })
  return res.entries
}

/* ------------------------------------------------------------------ */
/*  Create tenant                                                      */
/* ------------------------------------------------------------------ */

export async function createTenant(data: CreateTenantData): Promise<CreateTenantResult> {
  if (isDev) return delay({ tenantId: data.slug, name: data.name, adminCreated: !!data.adminEmail })
  return adminPost<CreateTenantResult>('/tenants', {
    name:          data.name,
    slug:          data.slug,
    contactEmail:  data.contactEmail,
    planId:        data.planId ?? null,
    adminEmail:    data.adminEmail ?? null,
    adminUsername: data.adminUsername ?? null,
  })
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
