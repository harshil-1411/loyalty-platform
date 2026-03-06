"""Functional tests for API key management endpoints."""

import os
import pytest
import boto3
from fastapi.testclient import TestClient
from moto import mock_aws

TABLE_NAME = "loyalty-test"
TENANT = "test-tenant"
HEADERS = {"X-Tenant-Id": TENANT}


@pytest.fixture(scope="module")
def client():
    os.environ["TABLE_NAME"] = TABLE_NAME
    from app.main import app
    return TestClient(app)


async def _fake_super_admin():
    return "test-super-admin-sub"


def _create_table():
    ddb = boto3.client("dynamodb", region_name="us-east-1")
    ddb.create_table(
        TableName=TABLE_NAME,
        KeySchema=[
            {"AttributeName": "pk", "KeyType": "HASH"},
            {"AttributeName": "sk", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "pk", "AttributeType": "S"},
            {"AttributeName": "sk", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def _with_admin(app):
    """Override require_super_admin for test."""
    from app.deps import require_super_admin
    app.dependency_overrides[require_super_admin] = _fake_super_admin
    return require_super_admin


def _cleanup_admin(app, dep):
    app.dependency_overrides.pop(dep, None)


# ---------------------------------------------------------------------------
# Auth Guard
# ---------------------------------------------------------------------------

def test_create_api_key_without_auth_returns_403(client: TestClient):
    """Super admin endpoints return 403 without auth, not 401."""
    from app.main import app
    from app.deps import get_user_sub
    from fastapi import Request

    async def fake_user_sub(request: Request):
        return "some-user-sub"

    app.dependency_overrides[get_user_sub] = fake_user_sub
    try:
        r = client.post(f"/api/v1/admin/tenants/{TENANT}/api-keys", json={"name": "Test Key"})
        assert r.status_code == 403
    finally:
        app.dependency_overrides.pop(get_user_sub, None)


# ---------------------------------------------------------------------------
# Create API Key
# ---------------------------------------------------------------------------

@mock_aws
def test_create_api_key_returns_raw_key(client: TestClient):
    _create_table()
    from app.main import app
    dep = _with_admin(app)
    try:
        r = client.post(
            f"/api/v1/admin/tenants/{TENANT}/api-keys",
            json={"name": "Salon Production"},
            headers=HEADERS,
        )
        assert r.status_code == 201
        data = r.json()
        assert "rawKey" in data
        assert data["rawKey"].startswith("sk_live_")
        assert len(data["rawKey"]) == 40  # "sk_live_" (8) + 32 hex chars
        assert "keyId" in data
        assert data["name"] == "Salon Production"
        assert "keyPrefix" in data
        assert "createdAt" in data
    finally:
        _cleanup_admin(app, dep)


# ---------------------------------------------------------------------------
# List API Keys
# ---------------------------------------------------------------------------

@mock_aws
def test_list_api_keys_empty(client: TestClient):
    _create_table()
    from app.main import app
    dep = _with_admin(app)
    try:
        r = client.get(f"/api/v1/admin/tenants/{TENANT}/api-keys", headers=HEADERS)
        assert r.status_code == 200
        assert r.json()["apiKeys"] == []
    finally:
        _cleanup_admin(app, dep)


@mock_aws
def test_list_api_keys_returns_created_key(client: TestClient):
    _create_table()
    from app.main import app
    dep = _with_admin(app)
    try:
        create_r = client.post(
            f"/api/v1/admin/tenants/{TENANT}/api-keys",
            json={"name": "My Key"},
            headers=HEADERS,
        )
        assert create_r.status_code == 201
        key_id = create_r.json()["keyId"]

        list_r = client.get(f"/api/v1/admin/tenants/{TENANT}/api-keys", headers=HEADERS)
        assert list_r.status_code == 200
        keys = list_r.json()["apiKeys"]
        assert len(keys) == 1
        assert keys[0]["keyId"] == key_id
        assert keys[0]["name"] == "My Key"
        assert keys[0]["isActive"] is True
        assert "keyPrefix" in keys[0]
        assert "keyLast4" in keys[0]
    finally:
        _cleanup_admin(app, dep)


# ---------------------------------------------------------------------------
# Revoke API Key
# ---------------------------------------------------------------------------

@mock_aws
def test_revoke_api_key(client: TestClient):
    _create_table()
    from app.main import app
    dep = _with_admin(app)
    try:
        create_r = client.post(
            f"/api/v1/admin/tenants/{TENANT}/api-keys",
            json={"name": "Revoke Me"},
            headers=HEADERS,
        )
        key_id = create_r.json()["keyId"]

        revoke_r = client.delete(
            f"/api/v1/admin/tenants/{TENANT}/api-keys/{key_id}",
            headers=HEADERS,
        )
        assert revoke_r.status_code == 200
        assert revoke_r.json()["success"] is True

        # Key should show as inactive in list
        list_r = client.get(f"/api/v1/admin/tenants/{TENANT}/api-keys", headers=HEADERS)
        keys = list_r.json()["apiKeys"]
        assert len(keys) == 1
        assert keys[0]["isActive"] is False
    finally:
        _cleanup_admin(app, dep)


# ---------------------------------------------------------------------------
# API Key Validation (service-level)
# ---------------------------------------------------------------------------

@mock_aws
def test_validate_api_key_returns_tenant(client: TestClient):
    _create_table()
    from app.main import app
    dep = _with_admin(app)
    try:
        create_r = client.post(
            f"/api/v1/admin/tenants/{TENANT}/api-keys",
            json={"name": "Validate Me"},
            headers=HEADERS,
        )
        raw_key = create_r.json()["rawKey"]

        from app.services.api_keys import validate_api_key
        result = validate_api_key(raw_key)
        assert result is not None
        assert result["tenantId"] == TENANT
    finally:
        _cleanup_admin(app, dep)


@mock_aws
def test_validate_revoked_key_returns_none(client: TestClient):
    _create_table()
    from app.main import app
    dep = _with_admin(app)
    try:
        create_r = client.post(
            f"/api/v1/admin/tenants/{TENANT}/api-keys",
            json={"name": "Revoked Key"},
            headers=HEADERS,
        )
        raw_key = create_r.json()["rawKey"]
        key_id = create_r.json()["keyId"]

        # Revoke
        client.delete(f"/api/v1/admin/tenants/{TENANT}/api-keys/{key_id}", headers=HEADERS)

        from app.services.api_keys import validate_api_key
        result = validate_api_key(raw_key)
        assert result is None
    finally:
        _cleanup_admin(app, dep)


@mock_aws
def test_validate_unknown_key_returns_none():
    _create_table()
    from app.services.api_keys import validate_api_key
    result = validate_api_key("lp_test_00000000000000000000000000000000")
    assert result is None
