"""Tests for PATCH /me/tenant endpoint."""
import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client_with_pool():
    """Client with TABLE_NAME and USER_POOL_ID set."""
    os.environ["TABLE_NAME"] = "loyalty-test"
    os.environ["USER_POOL_ID"] = "us-east-1_testpool"
    try:
        from app.main import app
        yield TestClient(app)
    finally:
        os.environ.pop("TABLE_NAME", None)
        os.environ.pop("USER_POOL_ID", None)


def test_patch_my_tenant_success(client_with_pool: TestClient):
    """PATCH /me/tenant with valid tenantId calls Cognito and returns updated tenant."""
    from app.main import app
    from app.deps import get_tenant_id, get_user_sub

    async def fake_tenant():
        return "old-tenant"

    async def fake_user_sub():
        return "user-sub-123"

    mock_cognito = MagicMock()
    mock_cognito.admin_update_user_attributes.return_value = {}

    app.dependency_overrides[get_tenant_id] = fake_tenant
    app.dependency_overrides[get_user_sub] = fake_user_sub
    try:
        # boto3 is imported lazily inside the function body of me.py,
        # so we patch the module-level boto3.client directly.
        with patch("boto3.client", return_value=mock_cognito):
            response = client_with_pool.patch(
                "/api/v1/me/tenant",
                json={"tenantId": "new-tenant-id"},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["tenantId"] == "new-tenant-id"
        assert data["updated"] is True
        mock_cognito.admin_update_user_attributes.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_tenant_id, None)
        app.dependency_overrides.pop(get_user_sub, None)


def test_patch_my_tenant_empty_tenant_id_returns_400(client_with_pool: TestClient):
    """PATCH /me/tenant with empty tenantId returns 400 before touching Cognito."""
    from app.main import app
    from app.deps import get_tenant_id, get_user_sub

    async def fake_tenant():
        return "old-tenant"

    async def fake_user_sub():
        return "user-sub-123"

    app.dependency_overrides[get_tenant_id] = fake_tenant
    app.dependency_overrides[get_user_sub] = fake_user_sub
    try:
        response = client_with_pool.patch(
            "/api/v1/me/tenant",
            json={"tenantId": ""},
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "BAD_REQUEST"
    finally:
        app.dependency_overrides.pop(get_tenant_id, None)
        app.dependency_overrides.pop(get_user_sub, None)


def test_patch_my_tenant_without_auth_returns_401():
    """PATCH /me/tenant without X-Tenant-Id header returns 401 (auth guard fires first)."""
    os.environ["TABLE_NAME"] = "loyalty-test"
    try:
        from app.main import app
        client = TestClient(app)
        response = client.patch("/api/v1/me/tenant", json={"tenantId": "some-tenant"})
        assert response.status_code == 401
    finally:
        os.environ.pop("TABLE_NAME", None)
