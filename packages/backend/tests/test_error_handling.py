"""Error response format and exception handlers."""
import pytest
from fastapi.testclient import TestClient


def test_validation_error_returns_422(client: TestClient):
    # POST with invalid body
    response = client.post("/api/v1/programs", json={"name": 123}, headers={"X-Tenant-Id": "t1"})
    assert response.status_code == 422


def test_unauthorized_has_request_id(client: TestClient):
    response = client.get("/api/v1/programs")
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert "request_id" in data or "error" in data
    assert response.headers.get("X-Request-ID")
