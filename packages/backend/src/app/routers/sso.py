"""Partner SSO: HMAC-verified partner login → Cognito session tokens.

The salon backend signs: HMAC-SHA256("{partner}:{tenantId}:{email}:{ts}", sharedSecret)
This endpoint verifies the signature and issues a Cognito session for the admin.

Prerequisites (manual setup per tenant):
  1. Store SSO config in DynamoDB:
     pk = "TENANT#{tenantId}", sk = "SSO_CONFIG"
     attrs: { hmacSecret: "<shared-secret>" }
  2. Create corresponding Secrets Manager secret on salon side:
     loyalty/salon/{salonId}/sso-secret = { "secret": "<shared-secret>", "tenantId": "<tenantId>" }
  3. Set Lambda env vars: USER_POOL_ID, USER_POOL_CLIENT_ID, LOYALTY_DASHBOARD_URL
  4. User Pool Client must have ALLOW_ADMIN_USER_PASSWORD_AUTH auth flow enabled.
"""

import hashlib
import hmac as _hmac
import logging
import os
import secrets
import time

from fastapi import APIRouter, Query

from app.db import get_table
from app.exceptions import BadRequestError, UnauthorizedError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sso", tags=["SSO"])

_MAX_TS_SKEW_MS = 300_000  # 5 minutes — reject requests older than this


def _get_sso_config(tenant_id: str) -> dict | None:
    """Retrieve SSO config for a tenant from DynamoDB.
    Record: pk = TENANT#{tenant_id}, sk = SSO_CONFIG, attr: hmacSecret
    """
    try:
        table = get_table()
        res = table.get_item(
            Key={"pk": f"TENANT#{tenant_id}", "sk": "SSO_CONFIG"},
            ProjectionExpression="hmacSecret",
        )
        return res.get("Item")
    except Exception:  # noqa: BLE001
        return None


@router.post("/partner-login", response_model=dict)
def partner_login(
    partner: str = Query(..., description="Salon ID / partner identifier"),
    tenantId: str = Query(..., description="Loyalty platform tenant ID"),
    email: str = Query(..., description="Admin email address"),
    ts: str = Query(..., description="Unix timestamp in milliseconds (str)"),
    sig: str = Query(..., description="HMAC-SHA256 hex signature"),
) -> dict:
    """Validate HMAC-signed SSO request and issue Cognito tokens.

    Returns:
        { "redirectUrl": "https://dashboard/?sso_token=..." }  if LOYALTY_DASHBOARD_URL is set
        { "idToken": "..." }  otherwise
    """
    # 1. Timestamp freshness — prevent replay attacks
    try:
        ts_ms = int(ts)
    except ValueError:
        raise BadRequestError("Invalid ts parameter")
    now_ms = int(time.time() * 1000)
    if abs(now_ms - ts_ms) > _MAX_TS_SKEW_MS:
        raise UnauthorizedError("SSO request has expired")

    # 2. Look up tenant SSO config
    sso_config = _get_sso_config(tenantId)
    if not sso_config or not sso_config.get("hmacSecret"):
        raise UnauthorizedError("SSO not configured for this tenant")

    # 3. Verify HMAC-SHA256 signature
    payload = f"{partner}:{tenantId}:{email}:{ts}"
    expected = _hmac.new(
        key=sso_config["hmacSecret"].encode(),
        msg=payload.encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()
    if not _hmac.compare_digest(expected, sig):
        raise UnauthorizedError("Invalid SSO signature")

    # 4. Find or create Cognito user, then issue session
    user_pool_id = os.environ.get("USER_POOL_ID", "")
    client_id = os.environ.get("USER_POOL_CLIENT_ID", "")
    if not user_pool_id or not client_id:
        raise BadRequestError("SSO not configured: missing USER_POOL_ID or USER_POOL_CLIENT_ID")

    try:
        import uuid

        import boto3
        cognito = boto3.client("cognito-idp")

        # Find existing user by email, or create one.
        # With signInAliases={email:true}, Username cannot be an email —
        # use a generated "sso-<uuid>" username and set email as an attribute.
        existing = cognito.list_users(
            UserPoolId=user_pool_id,
            Filter=f'email = "{email}"',
            Limit=1,
        )
        if existing.get("Users"):
            username = existing["Users"][0]["Username"]
        else:
            username = f"sso-{uuid.uuid4().hex[:12]}"
            cognito.admin_create_user(
                UserPoolId=user_pool_id,
                Username=username,
                UserAttributes=[
                    {"Name": "email", "Value": email},
                    {"Name": "email_verified", "Value": "true"},
                    {"Name": "custom:tenant_id", "Value": tenantId},
                ],
                MessageAction="SUPPRESS",
            )

        # Ensure tenant attribute is current
        cognito.admin_update_user_attributes(
            UserPoolId=user_pool_id,
            Username=username,
            UserAttributes=[{"Name": "custom:tenant_id", "Value": tenantId}],
        )

        # Set a random permanent password so ADMIN_USER_PASSWORD_AUTH works
        # (Rotated on every SSO call — the user never uses this password directly)
        temp_password = secrets.token_urlsafe(20) + "!1Aa"
        cognito.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=username,
            Password=temp_password,
            Permanent=True,
        )

        # Issue tokens via ADMIN_USER_PASSWORD_AUTH
        auth_resp = cognito.admin_initiate_auth(
            UserPoolId=user_pool_id,
            ClientId=client_id,
            AuthFlow="ADMIN_USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": username, "PASSWORD": temp_password},
        )
        tokens = auth_resp.get("AuthenticationResult") or {}
        id_token = tokens.get("IdToken")
        if not id_token:
            raise BadRequestError("Failed to issue session token — verify User Pool Client auth flows")

        dashboard_url = os.environ.get("LOYALTY_DASHBOARD_URL", "")
        if dashboard_url:
            return {"redirectUrl": f"{dashboard_url}?sso_token={id_token}"}
        return {"idToken": id_token}

    except (BadRequestError, UnauthorizedError):
        raise
    except Exception as e:
        logger.exception("sso_error: %s (email=%s, partner=%s)", e, email, partner)
        raise BadRequestError(f"Failed to create SSO session: {e}")
