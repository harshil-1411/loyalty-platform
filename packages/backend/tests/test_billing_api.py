"""Functional tests for billing endpoints: status and subscription-link."""

import json
import os
from io import BytesIO
from unittest.mock import MagicMock, patch

import boto3
import pytest
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


def _put_tenant(planId: str | None = None, billingStatus: str = "none", currentPeriodEnd: str | None = None):
    """Helper: write a tenant record to the mocked DDB table."""
    ddb = boto3.resource("dynamodb", region_name="us-east-1")
    table = ddb.Table(TABLE_NAME)
    item: dict = {
        "pk": f"TENANT#{TENANT}",
        "sk": "TENANT",
        "billingStatus": billingStatus,
    }
    if planId is not None:
        item["planId"] = planId
    if currentPeriodEnd is not None:
        item["currentPeriodEnd"] = currentPeriodEnd
    table.put_item(Item=item)


# ---------------------------------------------------------------------------
# GET /billing/status
# ---------------------------------------------------------------------------

def test_billing_status_without_tenant_returns_401(client: TestClient):
    r = client.get("/api/v1/billing/status")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHORIZED"


@mock_aws
def test_billing_status_defaults_for_unknown_tenant(client: TestClient):
    """No tenant record in DDB → status=none, planId=null."""
    _create_table()
    r = client.get("/api/v1/billing/status", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["billingStatus"] == "none"
    assert data["planId"] is None
    assert data["currentPeriodEnd"] is None


@mock_aws
def test_billing_status_reflects_stored_plan(client: TestClient):
    _create_table()
    _put_tenant(planId="starter", billingStatus="active", currentPeriodEnd="2026-03-01T00:00:00.000Z")
    r = client.get("/api/v1/billing/status", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["planId"] == "starter"
    assert data["billingStatus"] == "active"
    assert data["currentPeriodEnd"] == "2026-03-01T00:00:00.000Z"


@mock_aws
def test_billing_status_no_plan_id(client: TestClient):
    _create_table()
    _put_tenant(billingStatus="trialing")
    r = client.get("/api/v1/billing/status", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["billingStatus"] == "trialing"
    assert data["planId"] is None


# ---------------------------------------------------------------------------
# POST /billing/subscription-link
# ---------------------------------------------------------------------------

def test_subscription_link_without_tenant_returns_401(client: TestClient):
    r = client.post("/api/v1/billing/subscription-link", json={"planKey": "starter"})
    assert r.status_code == 401


@mock_aws
def test_subscription_link_missing_plan_env_returns_400(client: TestClient):
    """When no Razorpay plan env vars are set, plan_id resolves to None → 400."""
    _create_table()
    with patch.dict(
        os.environ,
        {"RAZORPAY_PLAN_STARTER": "", "RAZORPAY_PLAN_GROWTH": "", "RAZORPAY_PLAN_SCALE": ""},
        clear=False,
    ):
        with patch("app.services.billing.get_razorpay_plan_id", return_value=None):
            r = client.post(
                "/api/v1/billing/subscription-link",
                json={"planKey": "starter"},
                headers=HEADERS,
            )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "BAD_REQUEST"


@mock_aws
def test_subscription_link_happy_path(client: TestClient):
    """With mocked Razorpay HTTP call, subscription-link returns shortUrl + subscriptionId."""
    _create_table()

    # Simulate Razorpay API response
    mock_response_body = json.dumps({
        "id": "sub_testXYZ123",
        "short_url": "https://rzp.io/i/testXYZ",
    }).encode("utf-8")

    mock_http_resp = MagicMock()
    mock_http_resp.read.return_value = mock_response_body
    mock_http_resp.__enter__ = lambda s: s
    mock_http_resp.__exit__ = MagicMock(return_value=False)

    with patch("app.services.billing.get_razorpay_plan_id", return_value="plan_abc123"), \
         patch("app.services.billing.get_razorpay_key_id", return_value="rzp_test_key"), \
         patch("app.services.billing.get_razorpay_key_secret", return_value="rzp_test_secret"), \
         patch("urllib.request.urlopen", return_value=mock_http_resp):
        r = client.post(
            "/api/v1/billing/subscription-link",
            json={"planKey": "starter", "email": "user@example.com"},
            headers=HEADERS,
        )

    assert r.status_code == 201
    data = r.json()
    assert data["shortUrl"] == "https://rzp.io/i/testXYZ"
    assert data["subscriptionId"] == "sub_testXYZ123"


@mock_aws
def test_subscription_link_invalid_plan_key_returns_400(client: TestClient):
    """An unrecognised planKey (not starter/growth/scale) results in 400."""
    _create_table()
    with patch("app.services.billing.get_razorpay_plan_id", return_value=None):
        r = client.post(
            "/api/v1/billing/subscription-link",
            json={"planKey": "enterprise"},
            headers=HEADERS,
        )
    assert r.status_code == 400
