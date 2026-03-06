"""
API Gateway HTTP API (v2) Lambda authorizer.
Validates Cognito JWT or API key and returns tenantId for backend X-Tenant-Id.
"""
import hashlib
import os
import json
import time
import urllib.request
import jwt
from jwt import PyJWKClient

import boto3

USER_POOL_ID = os.environ.get("USER_POOL_ID", "")
CLIENT_ID = os.environ.get("CLIENT_ID", "")
REGION = os.environ.get("AWS_REGION", "us-east-1")
# Only set in dev: allow users without custom:tenant_id to use this tenant. Prod: unset → deny if missing.
DEFAULT_TENANT_ID = os.environ.get("DEFAULT_TENANT_ID")
TABLE_NAME = os.environ.get("TABLE_NAME", "")

JWKS_URL = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"

_ddb_client = None


def _get_ddb_client():
    global _ddb_client
    if _ddb_client is None:
        _ddb_client = boto3.client("dynamodb", region_name=REGION)
    return _ddb_client


def get_token(event: dict) -> str | None:
    """Extract Bearer token from Authorization header. HTTP API passes headers lowercased."""
    headers = event.get("headers") or {}
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def get_api_key(event: dict) -> str | None:
    """Extract API key from X-API-Key header."""
    headers = event.get("headers") or {}
    return headers.get("x-api-key") or headers.get("X-API-Key") or None


def validate_api_key(api_key: str) -> dict | None:
    """Hash key, look up in DynamoDB, return tenant context or None."""
    if not TABLE_NAME:
        return None
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    try:
        result = _get_ddb_client().get_item(
            TableName=TABLE_NAME,
            Key={
                "pk": {"S": f"API_KEY#{key_hash}"},
                "sk": {"S": "API_KEY"},
            },
            ProjectionExpression="tenantId, programId, isActive, lastUsedAt",
        )
    except Exception:
        return None
    item = result.get("Item")
    if not item:
        return None
    is_active = item.get("isActive", {}).get("BOOL", False)
    if not is_active:
        return None
    tenant_id = item.get("tenantId", {}).get("S", "")
    if not tenant_id:
        return None
    program_id = item.get("programId", {}).get("S", "")

    # Fire-and-forget: update lastUsedAt only if absent or older than 1 hour
    last_used = item.get("lastUsedAt", {}).get("N")
    now = int(time.time())
    if last_used is None or now - int(last_used) > 3600:
        try:
            _get_ddb_client().update_item(
                TableName=TABLE_NAME,
                Key={
                    "pk": {"S": f"API_KEY#{key_hash}"},
                    "sk": {"S": "API_KEY"},
                },
                UpdateExpression="SET lastUsedAt = :now",
                ExpressionAttributeValues={":now": {"N": str(now)}},
            )
        except Exception:
            pass  # Non-critical — do not fail auth on tracking error

    return {
        "tenantId": tenant_id,
        "programId": program_id,
        "keyHash": key_hash[:16],
    }


def handler(event: dict, context: object) -> dict:
    """Lambda authorizer payload format 2.0. Return isAuthorized and context.tenantId."""
    token = get_token(event)
    api_key = get_api_key(event)

    if token:
        return _validate_jwt(token)
    elif api_key:
        result = validate_api_key(api_key)
        if not result:
            return {"isAuthorized": False}
        return {
            "isAuthorized": True,
            "context": {
                "tenantId": result["tenantId"],
                "sub": f"apikey:{result['keyHash']}",
                "cognito_username": "",
                "cognito_groups": "",
                "auth_type": "api_key",
                "api_key_id": result["keyHash"],
            },
        }
    else:
        return {"isAuthorized": False}


def _validate_jwt(token: str) -> dict:
    """Existing JWT validation path."""
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
