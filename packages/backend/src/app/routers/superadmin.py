"""Super-admin API: platform metrics, tenants, plans, billing events, users."""

from fastapi import APIRouter, Depends, Query

from app.deps import require_super_admin
from app.models.superadmin import (
    PlatformMetricsResponse,
    TenantListResponse,
    TenantDetailResponse,
    PlanDistributionListResponse,
    SubscriptionEventsResponse,
    UserListResponse,
    ProgramResponse,
)
from app.services import superadmin as svc
from app.exceptions import NotFoundError

router = APIRouter(prefix="/admin", tags=["Super Admin"])


@router.get("/metrics", response_model=PlatformMetricsResponse)
def get_platform_metrics(_user_sub: str = Depends(require_super_admin)):
    """Platform-wide aggregate metrics."""
    return svc.get_platform_metrics()


@router.get("/tenants", response_model=TenantListResponse)
def list_tenants(
    search: str | None = Query(None),
    plan: str | None = Query(None),
    status: str | None = Query(None),
    _user_sub: str = Depends(require_super_admin),
):
    """List all tenants with optional filters."""
    return svc.list_tenants(search=search, plan=plan, status=status)


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
