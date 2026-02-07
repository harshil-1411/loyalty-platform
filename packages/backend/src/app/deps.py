"""FastAPI dependencies: tenant resolution, auth."""

from fastapi import Header, Request

from app.exceptions import UnauthorizedError

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
