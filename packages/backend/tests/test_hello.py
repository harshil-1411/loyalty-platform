"""Hello and health endpoints."""
import pytest
from fastapi.testclient import TestClient


def test_hello_returns_200(client: TestClient):
    response = client.get("/api/v1/hello")
    assert response.status_code == 200
    data = response.json()
    assert data.get("message") == "Hello from Loyalty API"
    assert data.get("version") == "v1"


def test_hello_no_tenant_required(client: TestClient):
    # /hello does not require X-Tenant-Id
    response = client.get("/api/v1/hello")
    assert response.status_code == 200
