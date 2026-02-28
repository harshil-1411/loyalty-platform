"""Programs API (requires TABLE_NAME; use moto for full integration)."""
import os
import pytest
from fastapi.testclient import TestClient
from moto import mock_aws


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


@mock_aws
def test_programs_list_with_tenant(client_with_table: TestClient):
    """With moto, DynamoDB is mocked so we get 200 and empty list."""
    import boto3
    table_name = "loyalty-test"
    client = boto3.client("dynamodb", region_name="us-east-1")
    client.create_table(
        TableName=table_name,
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
    response = client_with_table.get("/api/v1/programs", headers={"X-Tenant-Id": "test-tenant"})
    assert response.status_code == 200
    data = response.json()
    assert "programs" in data
    assert isinstance(data["programs"], list)


@mock_aws
def test_update_program_returns_updated(client_with_table: TestClient):
    """PUT /programs/{id} updates the program name and returns the programId."""
    import boto3
    table_name = "loyalty-test"
    boto3.client("dynamodb", region_name="us-east-1").create_table(
        TableName=table_name,
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
    headers = {"X-Tenant-Id": "tenant-upd"}
    # Create a program first
    create_resp = client_with_table.post(
        "/api/v1/programs",
        json={"name": "Original Name", "currency": "INR"},
        headers=headers,
    )
    assert create_resp.status_code == 201
    program_id = create_resp.json()["programId"]

    # Update the program
    update_resp = client_with_table.put(
        f"/api/v1/programs/{program_id}",
        json={"name": "Updated Name"},
        headers=headers,
    )
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["programId"] == program_id
    assert "updatedAt" in data

    # Verify the name was updated via GET
    get_resp = client_with_table.get(f"/api/v1/programs/{program_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Updated Name"


@mock_aws
def test_update_program_not_found_returns_404(client_with_table: TestClient):
    """PUT /programs/{id} returns 404 when program does not exist."""
    import boto3
    table_name = "loyalty-test"
    boto3.client("dynamodb", region_name="us-east-1").create_table(
        TableName=table_name,
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
    response = client_with_table.put(
        "/api/v1/programs/nonexistent-program",
        json={"name": "New Name"},
        headers={"X-Tenant-Id": "tenant-upd"},
    )
    assert response.status_code == 404
