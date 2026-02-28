/**
 * Mock datasets for the super-admin frontend.
 *
 * Each record uses realistic Indian-market data that matches
 * the platform's Starter / Growth / Scale pricing tiers.
 * When the real backend APIs are ready, swap the imports in
 * `./index.ts` — the shape of every export here doubles as the
 * API response contract.
 */

/* ------------------------------------------------------------------ */
/*  Tenants                                                           */
/* ------------------------------------------------------------------ */

export type PlanKey = 'starter' | 'growth' | 'scale'
export type BillingStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'none'

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: PlanKey | null
  billingStatus: BillingStatus
  memberCount: number
  programCount: number
  transactionCount: number
  mrr: number // INR — monthly recurring revenue for this tenant
  createdAt: string // ISO 8601
  contactEmail: string
}

export const tenants: Tenant[] = [
  {
    id: 't-001',
    name: 'GlowUp Salon & Spa',
    slug: 'glowup',
    plan: 'growth',
    billingStatus: 'active',
    memberCount: 4820,
    programCount: 3,
    transactionCount: 18740,
    mrr: 3999,
    createdAt: '2025-03-12T08:30:00Z',
    contactEmail: 'ops@glowupsalon.in',
  },
  {
    id: 't-002',
    name: 'FreshBasket Retail',
    slug: 'freshbasket',
    plan: 'scale',
    billingStatus: 'active',
    memberCount: 12450,
    programCount: 5,
    transactionCount: 67200,
    mrr: 9999,
    createdAt: '2025-01-05T10:15:00Z',
    contactEmail: 'tech@freshbasket.co.in',
  },
  {
    id: 't-003',
    name: 'UrbanFit Gym',
    slug: 'urbanfit',
    plan: 'starter',
    billingStatus: 'active',
    memberCount: 680,
    programCount: 1,
    transactionCount: 3100,
    mrr: 999,
    createdAt: '2025-06-22T14:00:00Z',
    contactEmail: 'admin@urbanfit.in',
  },
  {
    id: 't-004',
    name: 'CaféCraft Brewers',
    slug: 'cafecraft',
    plan: 'starter',
    billingStatus: 'trialing',
    memberCount: 210,
    programCount: 1,
    transactionCount: 540,
    mrr: 0,
    createdAt: '2025-11-01T09:00:00Z',
    contactEmail: 'hello@cafecraft.in',
  },
  {
    id: 't-005',
    name: 'PetPals Veterinary',
    slug: 'petpals',
    plan: 'growth',
    billingStatus: 'past_due',
    memberCount: 1920,
    programCount: 2,
    transactionCount: 8600,
    mrr: 2999,
    createdAt: '2025-04-18T11:30:00Z',
    contactEmail: 'billing@petpalsvet.in',
  },
  {
    id: 't-006',
    name: 'StyleStreet Apparel',
    slug: 'stylestreet',
    plan: 'growth',
    billingStatus: 'active',
    memberCount: 7340,
    programCount: 4,
    transactionCount: 31200,
    mrr: 4999,
    createdAt: '2025-02-28T16:45:00Z',
    contactEmail: 'crm@stylestreet.in',
  },
  {
    id: 't-007',
    name: 'QuickFix Auto Services',
    slug: 'quickfix',
    plan: 'starter',
    billingStatus: 'cancelled',
    memberCount: 340,
    programCount: 1,
    transactionCount: 1280,
    mrr: 0,
    createdAt: '2025-07-10T07:20:00Z',
    contactEmail: 'support@quickfixauto.in',
  },
  {
    id: 't-008',
    name: 'BookNook Library Café',
    slug: 'booknook',
    plan: null,
    billingStatus: 'none',
    memberCount: 0,
    programCount: 0,
    transactionCount: 0,
    mrr: 0,
    createdAt: '2025-12-20T12:00:00Z',
    contactEmail: 'info@booknook.in',
  },
  {
    id: 't-009',
    name: 'SpiceRoute Restaurant Group',
    slug: 'spiceroute',
    plan: 'scale',
    billingStatus: 'active',
    memberCount: 15800,
    programCount: 6,
    transactionCount: 89400,
    mrr: 14999,
    createdAt: '2024-11-15T09:30:00Z',
    contactEmail: 'loyalty@spiceroute.co.in',
  },
  {
    id: 't-010',
    name: 'ZenWell Ayurveda',
    slug: 'zenwell',
    plan: 'starter',
    billingStatus: 'trialing',
    memberCount: 95,
    programCount: 1,
    transactionCount: 120,
    mrr: 0,
    createdAt: '2026-01-08T15:00:00Z',
    contactEmail: 'care@zenwell.in',
  },
]

/* ------------------------------------------------------------------ */
/*  Programs (per-tenant sample)                                      */
/* ------------------------------------------------------------------ */

export interface Program {
  id: string
  tenantId: string
  name: string
  currency: string
  memberCount: number
  createdAt: string
}

export const programs: Program[] = [
  { id: 'p-001', tenantId: 't-001', name: 'Glow Rewards', currency: 'INR', memberCount: 2400, createdAt: '2025-03-15T10:00:00Z' },
  { id: 'p-002', tenantId: 't-001', name: 'Spa VIP Club', currency: 'INR', memberCount: 1600, createdAt: '2025-05-01T10:00:00Z' },
  { id: 'p-003', tenantId: 't-001', name: 'Referral Bonus', currency: 'INR', memberCount: 820, createdAt: '2025-08-10T10:00:00Z' },
  { id: 'p-004', tenantId: 't-002', name: 'Fresh Points', currency: 'INR', memberCount: 8000, createdAt: '2025-01-10T10:00:00Z' },
  { id: 'p-005', tenantId: 't-002', name: 'Weekend Bonus', currency: 'INR', memberCount: 4450, createdAt: '2025-03-20T10:00:00Z' },
  { id: 'p-006', tenantId: 't-003', name: 'FitCoins', currency: 'INR', memberCount: 680, createdAt: '2025-06-25T10:00:00Z' },
  { id: 'p-007', tenantId: 't-006', name: 'Style Points', currency: 'INR', memberCount: 4200, createdAt: '2025-03-01T10:00:00Z' },
  { id: 'p-008', tenantId: 't-009', name: 'Spice Miles', currency: 'INR', memberCount: 9800, createdAt: '2024-12-01T10:00:00Z' },
  { id: 'p-009', tenantId: 't-009', name: 'Dine & Earn', currency: 'INR', memberCount: 6000, createdAt: '2025-02-10T10:00:00Z' },
]

/* ------------------------------------------------------------------ */
/*  Platform-wide metrics                                             */
/* ------------------------------------------------------------------ */

export interface PlatformMetrics {
  totalTenants: number
  activeSubscriptions: number
  trialSubscriptions: number
  totalMembers: number
  totalTransactions: number
  mrr: number
  arr: number
  mrrGrowthPct: number
  churnPct: number
  pastDueCount: number
}

export const platformMetrics: PlatformMetrics = {
  totalTenants: tenants.length,
  activeSubscriptions: tenants.filter((t) => t.billingStatus === 'active').length,
  trialSubscriptions: tenants.filter((t) => t.billingStatus === 'trialing').length,
  totalMembers: tenants.reduce((s, t) => s + t.memberCount, 0),
  totalTransactions: tenants.reduce((s, t) => s + t.transactionCount, 0),
  mrr: tenants.reduce((s, t) => s + t.mrr, 0),
  arr: tenants.reduce((s, t) => s + t.mrr, 0) * 12,
  mrrGrowthPct: 14.2,
  churnPct: 3.1,
  pastDueCount: tenants.filter((t) => t.billingStatus === 'past_due').length,
}

/* ------------------------------------------------------------------ */
/*  Time-series data for charts                                       */
/* ------------------------------------------------------------------ */

export interface TimeSeriesPoint {
  month: string
  value: number
}

export const tenantGrowth: TimeSeriesPoint[] = [
  { month: 'Apr 25', value: 3 },
  { month: 'May 25', value: 4 },
  { month: 'Jun 25', value: 5 },
  { month: 'Jul 25', value: 6 },
  { month: 'Aug 25', value: 6 },
  { month: 'Sep 25', value: 7 },
  { month: 'Oct 25', value: 7 },
  { month: 'Nov 25', value: 8 },
  { month: 'Dec 25', value: 9 },
  { month: 'Jan 26', value: 9 },
  { month: 'Feb 26', value: 10 },
]

export const revenueTrend: TimeSeriesPoint[] = [
  { month: 'Apr 25', value: 7997 },
  { month: 'May 25', value: 11996 },
  { month: 'Jun 25', value: 15995 },
  { month: 'Jul 25', value: 19994 },
  { month: 'Aug 25', value: 22993 },
  { month: 'Sep 25', value: 26992 },
  { month: 'Oct 25', value: 29991 },
  { month: 'Nov 25', value: 32990 },
  { month: 'Dec 25', value: 34989 },
  { month: 'Jan 26', value: 36994 },
  { month: 'Feb 26', value: 37994 },
]

export interface PlanDistribution {
  plan: string
  count: number
}

export const planDistribution: PlanDistribution[] = [
  { plan: 'Starter', count: tenants.filter((t) => t.plan === 'starter').length },
  { plan: 'Growth', count: tenants.filter((t) => t.plan === 'growth').length },
  { plan: 'Scale', count: tenants.filter((t) => t.plan === 'scale').length },
  { plan: 'No Plan', count: tenants.filter((t) => t.plan === null).length },
]

/* ------------------------------------------------------------------ */
/*  Pricing plans (matches docs/PRICING.md)                           */
/* ------------------------------------------------------------------ */

export interface PricingPlan {
  key: PlanKey
  name: string
  priceRange: string
  monthlyPrice: number // lower-bound INR
  features: string[]
  limits: { programs: number | 'Unlimited'; members: number | 'Unlimited' }
}

export const pricingPlans: PricingPlan[] = [
  {
    key: 'starter',
    name: 'Starter',
    priceRange: '₹999 – ₹1,499/mo',
    monthlyPrice: 999,
    features: [
      '1 loyalty program',
      'Up to 1,000 active members',
      'Basic reporting',
      'Email support',
    ],
    limits: { programs: 1, members: 1000 },
  },
  {
    key: 'growth',
    name: 'Growth',
    priceRange: '₹2,999 – ₹4,999/mo',
    monthlyPrice: 2999,
    features: [
      'Multiple programs',
      'Up to 10,000 active members',
      'API access',
      'Advanced reporting',
      'Priority support',
    ],
    limits: { programs: 10, members: 10000 },
  },
  {
    key: 'scale',
    name: 'Scale / Enterprise',
    priceRange: 'Custom pricing',
    monthlyPrice: 9999,
    features: [
      'Unlimited programs',
      'Unlimited members',
      'Dedicated account manager',
      'Custom SLA',
      'SSO & RBAC',
      'White-label option',
    ],
    limits: { programs: 'Unlimited', members: 'Unlimited' },
  },
]

/* ------------------------------------------------------------------ */
/*  Subscription events (for billing overview table)                  */
/* ------------------------------------------------------------------ */

export interface SubscriptionEvent {
  id: string
  tenantId: string
  tenantName: string
  event: 'created' | 'renewed' | 'cancelled' | 'past_due' | 'trial_started'
  plan: PlanKey
  amount: number
  date: string
}

export const subscriptionEvents: SubscriptionEvent[] = [
  { id: 'se-01', tenantId: 't-010', tenantName: 'ZenWell Ayurveda', event: 'trial_started', plan: 'starter', amount: 0, date: '2026-01-08T15:00:00Z' },
  { id: 'se-02', tenantId: 't-008', tenantName: 'BookNook Library Café', event: 'created', plan: 'starter', amount: 0, date: '2025-12-20T12:00:00Z' },
  { id: 'se-03', tenantId: 't-004', tenantName: 'CaféCraft Brewers', event: 'trial_started', plan: 'starter', amount: 0, date: '2025-11-01T09:00:00Z' },
  { id: 'se-04', tenantId: 't-002', tenantName: 'FreshBasket Retail', event: 'renewed', plan: 'scale', amount: 9999, date: '2026-02-01T00:00:00Z' },
  { id: 'se-05', tenantId: 't-006', tenantName: 'StyleStreet Apparel', event: 'renewed', plan: 'growth', amount: 4999, date: '2026-02-01T00:00:00Z' },
  { id: 'se-06', tenantId: 't-005', tenantName: 'PetPals Veterinary', event: 'past_due', plan: 'growth', amount: 2999, date: '2026-01-15T00:00:00Z' },
  { id: 'se-07', tenantId: 't-007', tenantName: 'QuickFix Auto Services', event: 'cancelled', plan: 'starter', amount: 0, date: '2025-10-30T00:00:00Z' },
  { id: 'se-08', tenantId: 't-009', tenantName: 'SpiceRoute Restaurant Group', event: 'renewed', plan: 'scale', amount: 14999, date: '2026-02-01T00:00:00Z' },
  { id: 'se-09', tenantId: 't-001', tenantName: 'GlowUp Salon & Spa', event: 'renewed', plan: 'growth', amount: 3999, date: '2026-02-01T00:00:00Z' },
  { id: 'se-10', tenantId: 't-003', tenantName: 'UrbanFit Gym', event: 'renewed', plan: 'starter', amount: 999, date: '2026-02-01T00:00:00Z' },
]

/* ------------------------------------------------------------------ */
/*  Audit log                                                         */
/* ------------------------------------------------------------------ */

export interface AuditLogEntry {
  id: string
  action: string
  actor: string
  targetId: string
  targetName: string
  details: string  // JSON string
  createdAt: string
}

export const auditLog: AuditLogEntry[] = [
  { id: 'al-01', action: 'plan_changed',   actor: 'suparnbector', targetId: 't-002', targetName: 'FreshBasket Retail',    details: '{"plan":"scale"}',              createdAt: '2026-02-05T11:20:00Z' },
  { id: 'al-02', action: 'status_changed', actor: 'suparnbector', targetId: 't-007', targetName: 'QuickFix Auto Services', details: '{"status":"cancelled"}',          createdAt: '2025-10-30T09:15:00Z' },
  { id: 'al-03', action: 'user_disabled',  actor: 'suparnbector', targetId: 'arjun.patel', targetName: 'arjun.patel',     details: '{}',                             createdAt: '2025-10-30T09:20:00Z' },
  { id: 'al-04', action: 'plan_changed',   actor: 'suparnbector', targetId: 't-001', targetName: 'GlowUp Salon & Spa',    details: '{"plan":"growth"}',              createdAt: '2026-01-12T14:05:00Z' },
  { id: 'al-05', action: 'tenant_created', actor: 'suparnbector', targetId: 't-010', targetName: 'ZenWell Ayurveda',      details: '{"planId":"starter","adminCreated":true}', createdAt: '2026-01-08T15:00:00Z' },
  { id: 'al-06', action: 'password_reset', actor: 'suparnbector', targetId: 'neha.gupta', targetName: 'neha.gupta',      details: '{}',                             createdAt: '2026-01-25T08:30:00Z' },
  { id: 'al-07', action: 'status_changed', actor: 'suparnbector', targetId: 't-005', targetName: 'PetPals Veterinary',    details: '{"status":"active"}',            createdAt: '2026-02-02T10:45:00Z' },
  { id: 'al-08', action: 'user_enabled',   actor: 'suparnbector', targetId: 'arjun.patel', targetName: 'arjun.patel',     details: '{}',                             createdAt: '2026-02-03T16:10:00Z' },
  { id: 'al-09', action: 'plan_changed',   actor: 'suparnbector', targetId: 't-009', targetName: 'SpiceRoute Restaurant', details: '{"plan":"scale"}',              createdAt: '2026-02-06T09:00:00Z' },
  { id: 'al-10', action: 'tenant_created', actor: 'suparnbector', targetId: 't-008', targetName: 'BookNook Library Café',  details: '{"planId":"starter","adminCreated":true}', createdAt: '2025-12-20T12:00:00Z' },
]

/* ------------------------------------------------------------------ */
/*  Users                                                             */
/* ------------------------------------------------------------------ */

export type UserStatus = 'confirmed' | 'unconfirmed' | 'disabled'

export interface PlatformUser {
  id: string
  username: string
  email: string
  tenantId: string
  tenantName: string
  role: 'tenant_admin' | 'super_admin'
  status: UserStatus
  lastSignIn: string | null
  createdAt: string
}

export const users: PlatformUser[] = [
  { id: 'u-001', username: 'superadmin', email: 'admin@loyaltyplatform.dev', tenantId: '', tenantName: 'Platform', role: 'super_admin', status: 'confirmed', lastSignIn: '2026-02-07T08:00:00Z', createdAt: '2024-10-01T10:00:00Z' },
  { id: 'u-002', username: 'priya.sharma', email: 'priya@glowupsalon.in', tenantId: 't-001', tenantName: 'GlowUp Salon & Spa', role: 'tenant_admin', status: 'confirmed', lastSignIn: '2026-02-06T17:30:00Z', createdAt: '2025-03-12T08:30:00Z' },
  { id: 'u-003', username: 'rahul.mehta', email: 'rahul@freshbasket.co.in', tenantId: 't-002', tenantName: 'FreshBasket Retail', role: 'tenant_admin', status: 'confirmed', lastSignIn: '2026-02-07T06:15:00Z', createdAt: '2025-01-05T10:15:00Z' },
  { id: 'u-004', username: 'ankit.jain', email: 'ankit@urbanfit.in', tenantId: 't-003', tenantName: 'UrbanFit Gym', role: 'tenant_admin', status: 'confirmed', lastSignIn: '2026-02-05T12:00:00Z', createdAt: '2025-06-22T14:00:00Z' },
  { id: 'u-005', username: 'neha.gupta', email: 'neha@cafecraft.in', tenantId: 't-004', tenantName: 'CaféCraft Brewers', role: 'tenant_admin', status: 'confirmed', lastSignIn: '2026-01-28T09:00:00Z', createdAt: '2025-11-01T09:00:00Z' },
  { id: 'u-006', username: 'vikram.singh', email: 'vikram@petpalsvet.in', tenantId: 't-005', tenantName: 'PetPals Veterinary', role: 'tenant_admin', status: 'confirmed', lastSignIn: '2026-02-04T14:45:00Z', createdAt: '2025-04-18T11:30:00Z' },
  { id: 'u-007', username: 'meera.reddy', email: 'meera@stylestreet.in', tenantId: 't-006', tenantName: 'StyleStreet Apparel', role: 'tenant_admin', status: 'confirmed', lastSignIn: '2026-02-07T07:00:00Z', createdAt: '2025-02-28T16:45:00Z' },
  { id: 'u-008', username: 'arjun.patel', email: 'arjun@quickfixauto.in', tenantId: 't-007', tenantName: 'QuickFix Auto Services', role: 'tenant_admin', status: 'disabled', lastSignIn: '2025-10-15T10:00:00Z', createdAt: '2025-07-10T07:20:00Z' },
  { id: 'u-009', username: 'divya.nair', email: 'divya@booknook.in', tenantId: 't-008', tenantName: 'BookNook Library Café', role: 'tenant_admin', status: 'unconfirmed', lastSignIn: null, createdAt: '2025-12-20T12:00:00Z' },
  { id: 'u-010', username: 'karan.kapoor', email: 'karan@spiceroute.co.in', tenantId: 't-009', tenantName: 'SpiceRoute Restaurant Group', role: 'tenant_admin', status: 'confirmed', lastSignIn: '2026-02-07T05:30:00Z', createdAt: '2024-11-15T09:30:00Z' },
  { id: 'u-011', username: 'sneha.iyer', email: 'sneha@zenwell.in', tenantId: 't-010', tenantName: 'ZenWell Ayurveda', role: 'tenant_admin', status: 'confirmed', lastSignIn: '2026-02-06T10:00:00Z', createdAt: '2026-01-08T15:00:00Z' },
]
