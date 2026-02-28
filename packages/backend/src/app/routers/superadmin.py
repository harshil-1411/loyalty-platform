"""Super-admin API: platform metrics, tenants, plans, billing events, users."""

from fastapi import APIRouter, Depends, Query

from app.deps import require_super_admin, get_cognito_username
from app.models.superadmin import (
    PlatformMetricsResponse,
    TenantListResponse,
    TenantDetailResponse,
    PlanDistributionListResponse,
    SubscriptionEventsResponse,
    AuditLogResponse,
    CreateTenantRequest,
    CreateTenantResponse,
    UserListResponse,
    ProgramResponse,
    SuccessResponse,
    PatchTenantPlanRequest,
    PatchTenantStatusRequest,
    TimeSeriesResponse,
)
from app.services import superadmin as svc
from app.exceptions import NotFoundError

router = APIRouter(prefix="/admin", tags=["Super Admin"])


@router.get("/metrics", response_model=PlatformMetricsResponse)
def get_platform_metrics(_user_sub: str = Depends(require_super_admin)):
    """Platform-wide aggregate metrics."""
    return svc.get_platform_metrics()


@router.get("/metrics/tenant-growth", response_model=TimeSeriesResponse)
def get_tenant_growth(_user_sub: str = Depends(require_super_admin)):
    """Monthly new-tenant counts for the last 12 months."""
    return svc.get_tenant_growth_series()


@router.get("/metrics/revenue-trend", response_model=TimeSeriesResponse)
def get_revenue_trend(_user_sub: str = Depends(require_super_admin)):
    """Cumulative MRR trend for the last 12 months."""
    return svc.get_revenue_trend_series()


@router.get("/tenants", response_model=TenantListResponse)
def list_tenants(
    search: str | None = Query(None),
    plan: str | None = Query(None),
    status: str | None = Query(None),
    _user_sub: str = Depends(require_super_admin),
):
    """List all tenants with optional filters."""
    return svc.list_tenants(search=search, plan=plan, status=status)


@router.post("/tenants", response_model=CreateTenantResponse, status_code=201)
def create_tenant(
    body: CreateTenantRequest,
    actor: str = Depends(get_cognito_username),
    _user_sub: str = Depends(require_super_admin),
):
    """Provision a new tenant (and optionally a Cognito admin user)."""
    return svc.create_tenant(
        name=body.name,
        slug=body.slug,
        contact_email=body.contactEmail,
        plan_id=body.planId,
        admin_email=body.adminEmail,
        admin_username=body.adminUsername,
        actor=actor,
    )


@router.get("/tenants/{tenant_id}", response_model=TenantDetailResponse)
def get_tenant_detail(
    tenant_id: str,
    _user_sub: str = Depends(require_super_admin),
):
    """Single tenant detail with programs."""
    detail = svc.get_tenant_detail(tenant_id)
    if not detail:
        raise NotFoundError("Tenant not found")
    return detail


@router.get("/tenants/{tenant_id}/programs", response_model=list[ProgramResponse])
def get_tenant_programs(
    tenant_id: str,
    _user_sub: str = Depends(require_super_admin),
):
    """Programs for a specific tenant."""
    return svc.get_tenant_programs(tenant_id)


@router.get("/plans", response_model=PlanDistributionListResponse)
def list_plans(_user_sub: str = Depends(require_super_admin)):
    """Plan distribution (tenant counts per plan)."""
    return svc.list_plans()


@router.get("/billing/events", response_model=SubscriptionEventsResponse)
def get_subscription_events(
    limit: int = Query(50, ge=1, le=200),
    _user_sub: str = Depends(require_super_admin),
):
    """Recent subscription events."""
    return svc.get_subscription_events(limit=limit)


@router.get("/users", response_model=UserListResponse)
def list_users(
    search: str | None = Query(None),
    tenantId: str | None = Query(None, alias="tenantId"),
    role: str | None = Query(None),
    _user_sub: str = Depends(require_super_admin),
):
    """List Cognito users with optional filters."""
    return svc.list_users(search=search, tenant_id=tenantId, role=role)


@router.get("/audit-log", response_model=AuditLogResponse)
def get_audit_log(
    tenantId: str | None = Query(None, alias="tenantId"),
    limit: int = Query(50, ge=1, le=200),
    _user_sub: str = Depends(require_super_admin),
):
    """Recent super-admin audit log (plan changes, suspensions, user actions)."""
    return svc.get_audit_log(tenant_id=tenantId, limit=limit)


@router.post("/users/{username}/disable", response_model=SuccessResponse)
def disable_user(
    username: str,
    actor: str = Depends(get_cognito_username),
    _user_sub: str = Depends(require_super_admin),
):
    """Disable a Cognito user account."""
    svc.disable_user(username, actor=actor)
    return SuccessResponse()


@router.post("/users/{username}/enable", response_model=SuccessResponse)
def enable_user(
    username: str,
    actor: str = Depends(get_cognito_username),
    _user_sub: str = Depends(require_super_admin),
):
    """Enable a previously disabled Cognito user account."""
    svc.enable_user(username, actor=actor)
    return SuccessResponse()


@router.post("/users/{username}/reset-password", response_model=SuccessResponse)
def reset_user_password(
    username: str,
    actor: str = Depends(get_cognito_username),
    _user_sub: str = Depends(require_super_admin),
):
    """Send a Cognito password-reset email to the user."""
    svc.reset_user_password(username, actor=actor)
    return SuccessResponse()


@router.patch("/tenants/{tenant_id}/plan", response_model=SuccessResponse)
def patch_tenant_plan(
    tenant_id: str,
    body: PatchTenantPlanRequest,
    actor: str = Depends(get_cognito_username),
    _user_sub: str = Depends(require_super_admin),
):
    """Update a tenant's subscription plan."""
    svc.patch_tenant_plan(tenant_id, body.plan, actor=actor)
    return SuccessResponse()


@router.patch("/tenants/{tenant_id}/status", response_model=SuccessResponse)
def patch_tenant_status(
    tenant_id: str,
    body: PatchTenantStatusRequest,
    actor: str = Depends(get_cognito_username),
    _user_sub: str = Depends(require_super_admin),
):
    """Update a tenant's billing status (active / cancelled)."""
    svc.patch_tenant_status(tenant_id, body.status, actor=actor)
    return SuccessResponse()
