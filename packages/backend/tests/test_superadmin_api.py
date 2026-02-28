"""Super-admin API tests: auth guard (403 when not super admin), endpoints with moto DynamoDB."""
import os
import pytest
from fastapi.testclient import TestClient
from moto import mock_aws


@pytest.fixture
def table_name():
    return "loyalty-test"


@pytest.fixture
def client_with_table(table_name):
    os.environ["TABLE_NAME"] = table_name
    try:
        from app.main import app
        yield TestClient(app)
    finally:
        os.environ.pop("TABLE_NAME", None)


async def _fake_super_admin():
    return "test-super-admin-sub"


def test_admin_metrics_without_super_admin_returns_403(client_with_table: TestClient):
    """Without super admin group (and no bypass), GET /admin/metrics returns 403."""
    from fastapi import Request
    from app.main import app
    from app.deps import get_user_sub

    # Ensure user_sub is present so require_super_admin runs and fails on group check
    async def fake_user_sub(request: Request):
        return "some-user-sub"

    app.dependency_overrides[get_user_sub] = fake_user_sub
    try:
        response = client_with_table.get("/api/v1/admin/metrics")
        assert response.status_code == 403
        data = response.json()
        assert data.get("error", {}).get("code") == "FORBIDDEN"
    finally:
        app.dependency_overrides.pop(get_user_sub, None)


@mock_aws
def test_admin_metrics_with_super_admin_succeeds(client_with_table: TestClient, table_name: str):
    """With require_super_admin overridden, GET /admin/metrics returns 200 and metrics."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        response = client_with_table.get("/api/v1/admin/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "totalTenants" in data
        assert data["totalTenants"] == 0
        assert "mrr" in data
        assert "activeSubscriptions" in data
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


@mock_aws
def test_admin_tenants_list(client_with_table: TestClient, table_name: str):
    """GET /admin/tenants returns tenant list; with seed data returns tenants."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    resource = boto3.resource("dynamodb", region_name="us-east-1")
    table = resource.Table(table_name)
    table.put_item(
        Item={
            "pk": "TENANT#t-001",
            "sk": "TENANT",
            "name": "Test Tenant",
            "planId": "starter",
            "billingStatus": "active",
            "createdAt": "2025-01-01T00:00:00Z",
        }
    )
    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        response = client_with_table.get("/api/v1/admin/tenants")
        assert response.status_code == 200
        data = response.json()
        assert "tenants" in data
        assert len(data["tenants"]) == 1
        assert data["tenants"][0]["id"] == "t-001"
        assert data["tenants"][0]["name"] == "Test Tenant"
        assert data["tenants"][0]["plan"] == "starter"
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


@mock_aws
def test_admin_tenant_detail_not_found(client_with_table: TestClient, table_name: str):
    """GET /admin/tenants/{id} returns 404 when tenant does not exist."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        response = client_with_table.get("/api/v1/admin/tenants/nonexistent")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


@mock_aws
def test_admin_tenant_detail_found(client_with_table: TestClient, table_name: str):
    """GET /admin/tenants/{id} returns 200 and tenant + programs."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    resource = boto3.resource("dynamodb", region_name="us-east-1")
    table = resource.Table(table_name)
    table.put_item(
        Item={
            "pk": "TENANT#t-002",
            "sk": "TENANT",
            "name": "Detail Tenant",
            "planId": "growth",
            "billingStatus": "active",
            "createdAt": "2025-02-01T00:00:00Z",
        }
    )
    table.put_item(
        Item={
            "pk": "TENANT#t-002",
            "sk": "PROGRAM#prog-1",
            "name": "Loyalty Program",
            "currency": "INR",
            "createdAt": "2025-02-01T00:00:00Z",
        }
    )
    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        response = client_with_table.get("/api/v1/admin/tenants/t-002")
        assert response.status_code == 200
        data = response.json()
        assert "tenant" in data
        assert data["tenant"]["id"] == "t-002"
        assert data["tenant"]["name"] == "Detail Tenant"
        assert "programs" in data
        assert len(data["programs"]) == 1
        assert data["programs"][0]["name"] == "Loyalty Program"
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


@mock_aws
def test_admin_tenant_programs(client_with_table: TestClient, table_name: str):
    """GET /admin/tenants/{id}/programs returns list of programs."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    resource = boto3.resource("dynamodb", region_name="us-east-1")
    table = resource.Table(table_name)
    table.put_item(
        Item={
            "pk": "TENANT#t-003",
            "sk": "TENANT",
            "name": "Programs Tenant",
            "createdAt": "2025-01-01T00:00:00Z",
        }
    )
    table.put_item(
        Item={
            "pk": "TENANT#t-003",
            "sk": "PROGRAM#p1",
            "name": "Program One",
            "currency": "INR",
            "createdAt": "2025-01-01T00:00:00Z",
        }
    )
    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        response = client_with_table.get("/api/v1/admin/tenants/t-003/programs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == "p1"
        assert data[0]["name"] == "Program One"
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


@mock_aws
def test_admin_plans(client_with_table: TestClient, table_name: str):
    """GET /admin/plans returns plan distribution."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    resource = boto3.resource("dynamodb", region_name="us-east-1")
    table = resource.Table(table_name)
    table.put_item(
        Item={"pk": "TENANT#a", "sk": "TENANT", "planId": "starter"}
    )
    table.put_item(
        Item={"pk": "TENANT#b", "sk": "TENANT", "planId": "growth"}
    )
    table.put_item(
        Item={"pk": "TENANT#c", "sk": "TENANT", "planId": "starter"}
    )
    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        response = client_with_table.get("/api/v1/admin/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        plans = {p["plan"]: p["count"] for p in data["plans"]}
        assert plans.get("starter") == 2
        assert plans.get("growth") == 1
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


@mock_aws
def test_admin_billing_events(client_with_table: TestClient, table_name: str):
    """GET /admin/billing/events returns 200 (stub returns empty list)."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        response = client_with_table.get("/api/v1/admin/billing/events")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert data["events"] == []
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


@mock_aws
def test_admin_users(client_with_table: TestClient, table_name: str):
    """GET /admin/users returns 200 (Cognito not mocked, returns empty or skips)."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        # Without USER_POOL_ID the service returns empty users list
        response = client_with_table.get("/api/v1/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


# ── New metric series endpoints ──────────────────────────────────────────────


@mock_aws
def test_admin_tenant_growth_returns_12_months(client_with_table: TestClient, table_name: str):
    """GET /admin/metrics/tenant-growth returns 200 with 12 monthly data points."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    resource = boto3.resource("dynamodb", region_name="us-east-1")
    table = resource.Table(table_name)
    table.put_item(Item={
        "pk": "TENANT#t-growth-1",
        "sk": "TENANT",
        "name": "Growth Tenant",
        "createdAt": "2025-01-15T00:00:00Z",
    })
    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        response = client_with_table.get("/api/v1/admin/metrics/tenant-growth")
        assert response.status_code == 200
        data = response.json()
        assert "points" in data
        assert len(data["points"]) == 12
        for point in data["points"]:
            assert "month" in point
            assert "value" in point
            assert isinstance(point["value"], (int, float))
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


@mock_aws
def test_admin_revenue_trend_returns_12_months(client_with_table: TestClient, table_name: str):
    """GET /admin/metrics/revenue-trend returns 200 with 12 monthly MRR points."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    resource = boto3.resource("dynamodb", region_name="us-east-1")
    table = resource.Table(table_name)
    table.put_item(Item={
        "pk": "TENANT#t-rev-1",
        "sk": "TENANT",
        "name": "Revenue Tenant",
        "planId": "starter",
        "billingStatus": "active",
        "mrr": 999,
        "createdAt": "2025-01-01T00:00:00Z",
    })
    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        response = client_with_table.get("/api/v1/admin/metrics/revenue-trend")
        assert response.status_code == 200
        data = response.json()
        assert "points" in data
        assert len(data["points"]) == 12
        for point in data["points"]:
            assert "month" in point
            assert "value" in point
        # At least one point should have MRR > 0 since tenant was created in 2025-01
        values = [p["value"] for p in data["points"]]
        assert any(v > 0 for v in values)
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


# ── Missing mutation tests ────────────────────────────────────────────────────


@mock_aws
def test_admin_patch_tenant_plan(client_with_table: TestClient, table_name: str):
    """PATCH /admin/tenants/{id}/plan updates the tenant's plan."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    resource = boto3.resource("dynamodb", region_name="us-east-1")
    table = resource.Table(table_name)
    table.put_item(Item={"pk": "TENANT#t-plan", "sk": "TENANT", "name": "Plan Tenant", "planId": "starter"})

    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        response = client_with_table.patch(
            "/api/v1/admin/tenants/t-plan/plan",
            json={"plan": "growth"},
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        # Verify DynamoDB was updated
        item = table.get_item(Key={"pk": "TENANT#t-plan", "sk": "TENANT"})["Item"]
        assert item["planId"] == "growth"
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


@mock_aws
def test_admin_patch_tenant_status(client_with_table: TestClient, table_name: str):
    """PATCH /admin/tenants/{id}/status updates the tenant's billing status."""
    import boto3
    from app.main import app
    from app.deps import require_super_admin

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
    resource = boto3.resource("dynamodb", region_name="us-east-1")
    table = resource.Table(table_name)
    table.put_item(Item={"pk": "TENANT#t-status", "sk": "TENANT", "name": "Status Tenant", "billingStatus": "active"})

    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        response = client_with_table.patch(
            "/api/v1/admin/tenants/t-status/status",
            json={"status": "cancelled"},
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        item = table.get_item(Key={"pk": "TENANT#t-status", "sk": "TENANT"})["Item"]
        assert item["billingStatus"] == "cancelled"
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


@mock_aws
def test_admin_disable_enable_reset_user(client_with_table: TestClient, table_name: str):
    """POST /admin/users/{u}/disable|enable|reset-password each return 200 with Cognito mocked."""
    import boto3
    from unittest.mock import patch, MagicMock
    from app.main import app
    from app.deps import require_super_admin

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
    mock_cognito = MagicMock()
    mock_cognito.admin_disable_user.return_value = {}
    mock_cognito.admin_enable_user.return_value = {}
    mock_cognito.admin_reset_user_password.return_value = {}

    app.dependency_overrides[require_super_admin] = _fake_super_admin
    try:
        with patch("app.services.superadmin.boto3.client", return_value=mock_cognito):
            # disable
            r = client_with_table.post("/api/v1/admin/users/user-x/disable")
            assert r.status_code == 200
            assert r.json()["success"] is True

            # enable
            r = client_with_table.post("/api/v1/admin/users/user-x/enable")
            assert r.status_code == 200
            assert r.json()["success"] is True

            # reset-password
            r = client_with_table.post("/api/v1/admin/users/user-x/reset-password")
            assert r.status_code == 200
            assert r.json()["success"] is True
    finally:
        app.dependency_overrides.pop(require_super_admin, None)
