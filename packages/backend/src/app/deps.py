"""FastAPI dependencies: tenant resolution, auth."""

from fastapi import Header, Request

from app.config import settings
from app.exceptions import ForbiddenError, UnauthorizedError

TENANT_HEADER = "x-tenant-id"


async def get_tenant_id(
    request: Request,
    x_tenant_id: str | None = Header(None, alias=TENANT_HEADER),
) -> str:
    """Resolve tenant ID from header (set by API Gateway authorizer). Raises 401 if missing."""
    tenant = (x_tenant_id or "").strip() or getattr(request.state, "tenant_id", None)
    if not tenant:
        raise UnauthorizedError("Missing or invalid tenant (X-Tenant-Id required)")
    return tenant


async def get_user_sub(request: Request) -> str:
    """Cognito user sub from authorizer context. Raises 401 if missing."""
    sub = getattr(request.state, "user_sub", None) or ""
    if not sub:
        raise UnauthorizedError("User identity not available")
    return sub


async def get_cognito_username(request: Request) -> str:
    """Cognito pool username for Cognito admin API calls (e.g. AdminUpdateUserAttributes).
    Falls back to user_sub when cognito_username is not in authorizer context."""
    username = getattr(request.state, "cognito_username", None) or ""
    if username:
        return username
    return await get_user_sub(request)


async def require_super_admin(request: Request) -> str:
    """Verify caller is in the super_admin Cognito group. Returns user sub. In dev, SUPER_ADMIN_BYPASS=true skips check."""
    if settings.super_admin_bypass:
        return await get_user_sub(request)
    groups: list = getattr(request.state, "cognito_groups", None) or []
    if "super_admin" not in groups:
        raise ForbiddenError("Super admin access required")
    return await get_user_sub(request)
