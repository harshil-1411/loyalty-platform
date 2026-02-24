"""Super-admin API request/response models. Aligned with frontend types."""

from pydantic import BaseModel


class PlatformMetricsResponse(BaseModel):
    totalTenants: int
    activeSubscriptions: int
    trialSubscriptions: int
    totalMembers: int
    totalTransactions: int
    mrr: int
    arr: int
    mrrGrowthPct: float
    churnPct: float
    pastDueCount: int


class TenantResponse(BaseModel):
    id: str
    name: str
    slug: str
    plan: str | None
    billingStatus: str
    memberCount: int
    programCount: int
    transactionCount: int
    mrr: int
    createdAt: str
    contactEmail: str


class TenantListResponse(BaseModel):
    tenants: list[TenantResponse]


class PlanLimits(BaseModel):
    programs: int | str  # int or "Unlimited"
    members: int | str


class PricingPlanResponse(BaseModel):
    key: str
    name: str
    priceRange: str
    monthlyPrice: int
    features: list[str]
    limits: PlanLimits


class PlanDistributionResponse(BaseModel):
    plan: str
    count: int


class PlanDistributionListResponse(BaseModel):
    plans: list[PlanDistributionResponse]


class SubscriptionEventResponse(BaseModel):
    id: str
    tenantId: str
    tenantName: str
    event: str
    plan: str
    amount: int
    date: str


class SubscriptionEventsResponse(BaseModel):
    events: list[SubscriptionEventResponse]


class ProgramResponse(BaseModel):
    id: str
    tenantId: str
    name: str
    currency: str
    memberCount: int
    createdAt: str


class TenantDetailResponse(BaseModel):
    tenant: TenantResponse
    programs: list[ProgramResponse]


class PlatformUserResponse(BaseModel):
    id: str
    username: str
    email: str
    tenantId: str
    tenantName: str
    role: str
    status: str
    lastSignIn: str | None
    createdAt: str


class UserListResponse(BaseModel):
    users: list[PlatformUserResponse]


class TimeSeriesPoint(BaseModel):
    month: str
    value: int | float
