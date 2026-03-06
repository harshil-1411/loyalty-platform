"""Public auth endpoints — no JWT required.

POST /auth/validate-key
  Validates a salon's loyalty API key and returns tenant/program info + dashboard URL.
  Used by the salon backend during the self-service connection flow.

POST /auth/partner-sso
  API-key-based SSO: validates API key, creates/finds Cognito user with the
  salon admin's email, issues a Cognito ID token for the LP frontend.
  Used by the salon backend when the admin clicks "Open LP Dashboard".
"""

import logging
import os
import secrets

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr

from app.db import get_table, key
from app.exceptions import BadRequestError, UnauthorizedError
from app.services import api_keys

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


class ValidateKeyRequest(BaseModel):
    apiKey: str


class PartnerSsoRequest(BaseModel):
    apiKey: str
    email: EmailStr


@router.post("/validate-key")
def validate_key(body: ValidateKeyRequest) -> dict:
    """Validate a loyalty API key issued to a salon tenant.

    Returns tenant info and the dashboard URL on success.
    Raises 401 if the key is invalid or revoked.
    """
    result = api_keys.validate_api_key(body.apiKey)
    if not result:
        raise UnauthorizedError("Invalid or revoked API key")

    program_id = result.get("programId") or ""
    if not program_id:
        tenant_id = result["tenantId"]
        programs = get_table().query(
            KeyConditionExpression="pk = :pk AND begins_with(sk, :prefix)",
            ExpressionAttributeValues={":pk": key.program_pk(tenant_id), ":prefix": key.PROGRAM_SK_PREFIX},
            Limit=1,
        )
        if programs.get("Items"):
            program_id = programs["Items"][0]["sk"].replace(key.PROGRAM_SK_PREFIX, "")

    return {
        "tenantId": result["tenantId"],
        "programId": program_id,
        "dashboardUrl": os.environ.get("LOYALTY_DASHBOARD_URL") or os.environ.get("FRONTEND_URL", ""),
    }


@router.post("/partner-sso")
def partner_sso(body: PartnerSsoRequest) -> dict:
    """API-key-based SSO: validate key, issue Cognito session for the given email.

    Returns { ssoToken, dashboardUrl } so the salon backend can construct a
    redirect URL like ``dashboardUrl?sso_token=<token>``.
    """
    # 1. Validate API key
    result = api_keys.validate_api_key(body.apiKey)
    if not result:
        raise UnauthorizedError("Invalid or revoked API key")

    tenant_id = result["tenantId"]
    email = body.email

    # 2. Issue Cognito session
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
                    {"Name": "custom:tenant_id", "Value": tenant_id},
                ],
                MessageAction="SUPPRESS",
            )

        # Ensure tenant attribute is current
        cognito.admin_update_user_attributes(
            UserPoolId=user_pool_id,
            Username=username,
            UserAttributes=[{"Name": "custom:tenant_id", "Value": tenant_id}],
        )

        # Set random password (rotated each SSO call; user never uses it)
        temp_password = secrets.token_urlsafe(20) + "!1Aa"
        cognito.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=username,
            Password=temp_password,
            Permanent=True,
        )

        # Issue tokens
        auth_resp = cognito.admin_initiate_auth(
            UserPoolId=user_pool_id,
            ClientId=client_id,
            AuthFlow="ADMIN_USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": username, "PASSWORD": temp_password},
        )
        tokens = auth_resp.get("AuthenticationResult") or {}
        id_token = tokens.get("IdToken")
        if not id_token:
            raise BadRequestError("Failed to issue session token")

        dashboard_url = os.environ.get("LOYALTY_DASHBOARD_URL") or os.environ.get("FRONTEND_URL", "")
        return {"ssoToken": id_token, "dashboardUrl": dashboard_url}

    except (BadRequestError, UnauthorizedError):
        raise
    except Exception as e:
        logger.exception("partner_sso_error: %s (email=%s, tenant=%s)", e, email, tenant_id)
        raise BadRequestError(f"Failed to create SSO session: {e}")
