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


class TimeSeriesResponse(BaseModel):
    points: list[TimeSeriesPoint]


class AuditLogEntryResponse(BaseModel):
    id: str
    action: str
    actor: str
    targetId: str
    targetName: str
    details: str  # JSON-encoded details string
    createdAt: str


class AuditLogResponse(BaseModel):
    entries: list[AuditLogEntryResponse]


class CreateTenantRequest(BaseModel):
    name: str
    slug: str
    contactEmail: str
    planId: str | None = None          # "starter" | "growth" | "scale"
    adminEmail: str | None = None      # If set, creates a Cognito user
    adminUsername: str | None = None   # Optional; defaults to slug if not given


class CreateTenantResponse(BaseModel):
    tenantId: str
    name: str
    adminCreated: bool


class SuccessResponse(BaseModel):
    success: bool = True


class PatchTenantPlanRequest(BaseModel):
    plan: str | None  # "starter" | "growth" | "scale" | null


class PatchTenantStatusRequest(BaseModel):
    status: str  # "active" | "cancelled"
