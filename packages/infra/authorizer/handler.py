"""
API Gateway HTTP API (v2) Lambda authorizer.
Validates Cognito JWT and returns tenantId from custom:tenant_id claim for backend X-Tenant-Id.
"""
import os
import json
import urllib.request
import jwt
from jwt import PyJWKClient

USER_POOL_ID = os.environ.get("USER_POOL_ID", "")
CLIENT_ID = os.environ.get("CLIENT_ID", "")
REGION = os.environ.get("AWS_REGION", "us-east-1")
# Only set in dev: allow users without custom:tenant_id to use this tenant. Prod: unset → deny if missing.
DEFAULT_TENANT_ID = os.environ.get("DEFAULT_TENANT_ID")

JWKS_URL = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"


def get_token(event: dict) -> str | None:
    """Extract Bearer token from Authorization header. HTTP API passes headers lowercased."""
    headers = event.get("headers") or {}
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def handler(event: dict, context: object) -> dict:
    """Lambda authorizer payload format 2.0. Return isAuthorized and context.tenantId."""
    token = get_token(event)
    if not token:
        return {"isAuthorized": False}

    if not USER_POOL_ID or not CLIENT_ID:
        return {"isAuthorized": False}

    issuer = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}"
    try:
        jwks_client = PyJWKClient(JWKS_URL)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            issuer=issuer,
            options={"verify_exp": True},
        )
    except Exception:
        return {"isAuthorized": False}

    # Cognito custom attribute is exposed as custom:tenant_id in the token
    tenant_id = payload.get("custom:tenant_id") or payload.get("tenant_id")
    if not tenant_id or not isinstance(tenant_id, str):
        tenant_id = DEFAULT_TENANT_ID  # dev only; prod has this unset → deny
    if not tenant_id:
        return {"isAuthorized": False}

    sub = payload.get("sub") or ""
    # cognito:username is the actual pool username (needed for admin API calls)
    cognito_username = payload.get("cognito:username") or sub
    # cognito:groups is a list — API GW context only allows scalars, so join as CSV
    groups = payload.get("cognito:groups") or []
    groups_str = ",".join(groups) if isinstance(groups, list) else ""
    return {
        "isAuthorized": True,
        "context": {
            "tenantId": tenant_id.strip(),
            "sub": sub if isinstance(sub, str) else str(sub),
            "cognito_username": cognito_username if isinstance(cognito_username, str) else str(cognito_username),
            "cognito_groups": groups_str,
        },
    }
