"""Current user: set tenant (Cognito custom:tenant_id)."""
import os
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.deps import get_tenant_id, get_cognito_username
from app.exceptions import BadRequestError

router = APIRouter(prefix="/me", tags=["Me"])


class SetTenantBody(BaseModel):
    tenantId: str = ""


@router.patch("/tenant", response_model=dict)
def set_my_tenant(
    body: SetTenantBody,
    _tenant_id: str = Depends(get_tenant_id),
    cognito_username: str = Depends(get_cognito_username),
) -> dict:
    """Set the current user's Cognito custom:tenant_id. Requires backend USER_POOL_ID and Cognito permissions."""
    new_tenant = (body.tenantId or "").strip()
    if not new_tenant:
        raise BadRequestError("tenantId is required")
    pool_id = os.environ.get("USER_POOL_ID") or ""
    if not pool_id:
        raise BadRequestError("Tenant update not configured")
    try:
        import boto3
        client = boto3.client("cognito-idp")
        client.admin_update_user_attributes(
            UserPoolId=pool_id,
            Username=cognito_username,
            UserAttributes=[{"Name": "custom:tenant_id", "Value": new_tenant}],
        )
    except Exception as e:
        err = str(e).lower()
        if "usernotfound" in err or "not found" in err:
            raise BadRequestError("User not found")
        raise BadRequestError("Failed to update tenant")
    return {"tenantId": new_tenant, "updated": True}
