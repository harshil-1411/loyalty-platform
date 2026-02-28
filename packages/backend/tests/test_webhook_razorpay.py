"""Functional tests for Razorpay webhook: signature verification and event handling."""

import hashlib
import hmac
import json
import os
import time

import boto3
import pytest
from fastapi.testclient import TestClient
from moto import mock_aws
from unittest.mock import patch

TABLE_NAME = "loyalty-test"
TENANT = "tenant-webhook-test"
TEST_SECRET = "test_webhook_secret_xyz"


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


def _sign(body: str, secret: str = TEST_SECRET) -> str:
    """Compute expected Razorpay HMAC-SHA256 signature."""
    return hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()


def _make_payload(event: str, tenant_id: str = TENANT, current_end: int | None = None) -> dict:
    """Build a minimal Razorpay webhook payload for subscription events."""
    entity: dict = {
        "id": "sub_test123",
        "notes": {"tenant_id": tenant_id},
    }
    if current_end is not None:
        entity["current_end"] = current_end
    return {
        "event": event,
        "payload": {
            "subscription": {
                "entity": entity,
            }
        },
    }


# ---------------------------------------------------------------------------
# Signature verification
# ---------------------------------------------------------------------------

def test_webhook_missing_signature_returns_400(client: TestClient):
    with patch("app.services.webhook_razorpay.get_razorpay_webhook_secret", return_value=TEST_SECRET):
        r = client.post(
            "/api/v1/webhooks/razorpay",
            content=b'{"event": "subscription.charged"}',
            headers={"Content-Type": "application/json"},
        )
    assert r.status_code == 400
    assert "signature" in r.json().get("error", "").lower()


def test_webhook_invalid_signature_returns_400(client: TestClient):
    body = json.dumps(_make_payload("subscription.charged"))
    with patch("app.services.webhook_razorpay.get_razorpay_webhook_secret", return_value=TEST_SECRET):
        r = client.post(
            "/api/v1/webhooks/razorpay",
            content=body.encode(),
            headers={
                "Content-Type": "application/json",
                "x-razorpay-signature": "deadbeef_wrong_signature",
            },
        )
    assert r.status_code == 400
    assert "signature" in r.json().get("error", "").lower()


def test_webhook_unconfigured_secret_returns_500(client: TestClient):
    body = json.dumps(_make_payload("subscription.charged"))
    with patch("app.services.webhook_razorpay.get_razorpay_webhook_secret", return_value=""):
        r = client.post(
            "/api/v1/webhooks/razorpay",
            content=body.encode(),
            headers={
                "Content-Type": "application/json",
                "x-razorpay-signature": _sign(body),
            },
        )
    assert r.status_code == 500


# ---------------------------------------------------------------------------
# subscription.charged / subscription.activated → billing_status = "active"
# ---------------------------------------------------------------------------

@mock_aws
def test_webhook_subscription_charged_sets_active(client: TestClient):
    _create_table()
    future_ts = int(time.time()) + 30 * 24 * 3600  # 30 days from now
    payload = _make_payload("subscription.charged", current_end=future_ts)
    body = json.dumps(payload)
    sig = _sign(body)

    with patch("app.services.webhook_razorpay.get_razorpay_webhook_secret", return_value=TEST_SECRET):
        r = client.post(
            "/api/v1/webhooks/razorpay",
            content=body.encode(),
            headers={
                "Content-Type": "application/json",
                "x-razorpay-signature": sig,
            },
        )

    assert r.status_code == 200
    assert r.json() == {"received": True}

    # Verify tenant billing status was updated in DynamoDB
    ddb = boto3.resource("dynamodb", region_name="us-east-1")
    table = ddb.Table(TABLE_NAME)
    item = table.get_item(Key={"pk": f"TENANT#{TENANT}", "sk": "TENANT"}).get("Item")
    assert item is not None
    assert item["billingStatus"] == "active"
    assert item.get("razorpaySubscriptionId") == "sub_test123"
    assert item.get("currentPeriodEnd") is not None


@mock_aws
def test_webhook_subscription_activated_sets_active(client: TestClient):
    _create_table()
    payload = _make_payload("subscription.activated")
    body = json.dumps(payload)
    sig = _sign(body)

    with patch("app.services.webhook_razorpay.get_razorpay_webhook_secret", return_value=TEST_SECRET):
        r = client.post(
            "/api/v1/webhooks/razorpay",
            content=body.encode(),
            headers={
                "Content-Type": "application/json",
                "x-razorpay-signature": sig,
            },
        )

    assert r.status_code == 200
    ddb = boto3.resource("dynamodb", region_name="us-east-1")
    table = ddb.Table(TABLE_NAME)
    item = table.get_item(Key={"pk": f"TENANT#{TENANT}", "sk": "TENANT"}).get("Item")
    assert item["billingStatus"] == "active"


# ---------------------------------------------------------------------------
# subscription.cancelled / subscription.completed → billing_status = "cancelled"
# ---------------------------------------------------------------------------

@mock_aws
def test_webhook_subscription_cancelled_sets_cancelled(client: TestClient):
    _create_table()
    payload = _make_payload("subscription.cancelled")
    body = json.dumps(payload)
    sig = _sign(body)

    with patch("app.services.webhook_razorpay.get_razorpay_webhook_secret", return_value=TEST_SECRET):
        r = client.post(
            "/api/v1/webhooks/razorpay",
            content=body.encode(),
            headers={
                "Content-Type": "application/json",
                "x-razorpay-signature": sig,
            },
        )

    assert r.status_code == 200
    ddb = boto3.resource("dynamodb", region_name="us-east-1")
    table = ddb.Table(TABLE_NAME)
    item = table.get_item(Key={"pk": f"TENANT#{TENANT}", "sk": "TENANT"}).get("Item")
    assert item["billingStatus"] == "cancelled"


@mock_aws
def test_webhook_subscription_completed_sets_cancelled(client: TestClient):
    _create_table()
    payload = _make_payload("subscription.completed")
    body = json.dumps(payload)
    sig = _sign(body)

    with patch("app.services.webhook_razorpay.get_razorpay_webhook_secret", return_value=TEST_SECRET):
        r = client.post(
            "/api/v1/webhooks/razorpay",
            content=body.encode(),
            headers={
                "Content-Type": "application/json",
                "x-razorpay-signature": sig,
            },
        )

    assert r.status_code == 200
    ddb = boto3.resource("dynamodb", region_name="us-east-1")
    table = ddb.Table(TABLE_NAME)
    item = table.get_item(Key={"pk": f"TENANT#{TENANT}", "sk": "TENANT"}).get("Item")
    assert item["billingStatus"] == "cancelled"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

@mock_aws
def test_webhook_unknown_event_returns_200_no_db_write(client: TestClient):
    """Unhandled event types (e.g. payment.captured) should return 200 without error."""
    _create_table()
    payload = _make_payload("payment.captured")
    body = json.dumps(payload)
    sig = _sign(body)

    with patch("app.services.webhook_razorpay.get_razorpay_webhook_secret", return_value=TEST_SECRET):
        r = client.post(
            "/api/v1/webhooks/razorpay",
            content=body.encode(),
            headers={
                "Content-Type": "application/json",
                "x-razorpay-signature": sig,
            },
        )

    assert r.status_code == 200
    assert r.json() == {"received": True}


@mock_aws
def test_webhook_missing_tenant_in_notes_returns_200(client: TestClient):
    """Payload without tenant_id in notes is silently accepted (no DDB write)."""
    _create_table()
    payload = {
        "event": "subscription.charged",
        "payload": {
            "subscription": {
                "entity": {"id": "sub_xyz", "notes": {}}
            }
        },
    }
    body = json.dumps(payload)
    sig = _sign(body)

    with patch("app.services.webhook_razorpay.get_razorpay_webhook_secret", return_value=TEST_SECRET):
        r = client.post(
            "/api/v1/webhooks/razorpay",
            content=body.encode(),
            headers={
                "Content-Type": "application/json",
                "x-razorpay-signature": sig,
            },
        )

    assert r.status_code == 200
    assert r.json() == {"received": True}


def test_webhook_invalid_json_returns_400(client: TestClient):
    """Malformed JSON body → 400."""
    body_bytes = b"not-valid-json{"
    sig = _sign(body_bytes.decode())

    with patch("app.services.webhook_razorpay.get_razorpay_webhook_secret", return_value=TEST_SECRET):
        r = client.post(
            "/api/v1/webhooks/razorpay",
            content=body_bytes,
            headers={
                "Content-Type": "application/json",
                "x-razorpay-signature": sig,
            },
        )

    assert r.status_code == 400
