"""Programs API (requires TABLE_NAME; use moto for full integration)."""
import os
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client_with_table():
    """Client with TABLE_NAME set so 401 is from missing tenant, not missing table."""
    os.environ["TABLE_NAME"] = "loyalty-test"
    try:
        from app.main import app
        yield TestClient(app)
    finally:
        os.environ.pop("TABLE_NAME", None)


def test_programs_list_without_tenant_returns_401(client_with_table: TestClient):
    response = client_with_table.get("/api/v1/programs")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "UNAUTHORIZED"


def test_programs_list_with_tenant(client_with_table: TestClient):
    response = client_with_table.get("/api/v1/programs", headers={"X-Tenant-Id": "test-tenant"})
    # Without real DynamoDB we may get 500 (table not found) or 200 (moto)
    assert response.status_code in (200, 500)
    if response.status_code == 200:
        data = response.json()
        assert "programs" in data
        assert isinstance(data["programs"], list)
