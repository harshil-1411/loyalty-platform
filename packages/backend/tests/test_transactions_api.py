"""Functional tests for transactions endpoints: earn, burn, balance, list."""

import os
import pytest
import boto3
from fastapi.testclient import TestClient
from moto import mock_aws

TABLE_NAME = "loyalty-test"
TENANT = "test-tenant"
PROGRAM = "prog-001"
MEMBER = "alice"
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


# ---------------------------------------------------------------------------
# Earn
# ---------------------------------------------------------------------------

def test_earn_without_tenant_returns_401(client: TestClient):
    r = client.post(f"/api/v1/programs/{PROGRAM}/earn", json={"memberId": MEMBER, "points": 100})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHORIZED"


@mock_aws
def test_earn_happy_path(client: TestClient):
    _create_table()
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 100},
        headers=HEADERS,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["points"] == 100
    assert data["balance"] == 100
    assert "transactionId" in data


@mock_aws
def test_earn_accumulates_balance(client: TestClient):
    _create_table()
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 50},
        headers=HEADERS,
    )
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 30},
        headers=HEADERS,
    )
    assert r.status_code == 200
    assert r.json()["balance"] == 80


@mock_aws
def test_earn_negative_points_returns_400(client: TestClient):
    _create_table()
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": -10},
        headers=HEADERS,
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "BAD_REQUEST"


@mock_aws
def test_earn_zero_points_allowed(client: TestClient):
    _create_table()
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 0},
        headers=HEADERS,
    )
    assert r.status_code == 200
    assert r.json()["points"] == 0


@mock_aws
def test_earn_with_idempotency_key(client: TestClient):
    _create_table()
    payload = {"memberId": MEMBER, "points": 75, "idempotencyKey": "idem-abc-123"}
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json=payload,
        headers=HEADERS,
    )
    assert r.status_code == 200
    assert r.json()["transactionId"] == "idem-abc-123"


@mock_aws
def test_earn_idempotency_duplicate_returns_same_response(client: TestClient):
    """Retry with same idempotencyKey returns 200 without re-incrementing balance."""
    _create_table()
    payload = {"memberId": MEMBER, "points": 50, "idempotencyKey": "idem-dup-001"}
    r1 = client.post(f"/api/v1/programs/{PROGRAM}/earn", json=payload, headers=HEADERS)
    assert r1.status_code == 200
    assert r1.json()["balance"] == 50

    # Retry with same key — balance must NOT increase
    r2 = client.post(f"/api/v1/programs/{PROGRAM}/earn", json=payload, headers=HEADERS)
    assert r2.status_code == 200
    assert r2.json()["balance"] == 50
    assert r2.json()["transactionId"] == "idem-dup-001"

    # Verify balance via GET
    r3 = client.get(f"/api/v1/programs/{PROGRAM}/balance/{MEMBER}", headers=HEADERS)
    assert r3.json()["balance"] == 50


@mock_aws
def test_earn_idempotency_different_payload_returns_409(client: TestClient):
    """Same idempotencyKey with different points returns 409 Conflict."""
    _create_table()
    r1 = client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 50, "idempotencyKey": "idem-conflict-001"},
        headers=HEADERS,
    )
    assert r1.status_code == 200

    r2 = client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 99, "idempotencyKey": "idem-conflict-001"},
        headers=HEADERS,
    )
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "CONFLICT"


# ---------------------------------------------------------------------------
# Balance
# ---------------------------------------------------------------------------

def test_balance_without_tenant_returns_401(client: TestClient):
    r = client.get(f"/api/v1/programs/{PROGRAM}/balance/{MEMBER}")
    assert r.status_code == 401


@mock_aws
def test_balance_zero_for_new_member(client: TestClient):
    _create_table()
    r = client.get(f"/api/v1/programs/{PROGRAM}/balance/{MEMBER}", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["balance"] == 0
    assert data["memberId"] == MEMBER
    assert data["programId"] == PROGRAM


@mock_aws
def test_balance_reflects_earn(client: TestClient):
    _create_table()
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 200},
        headers=HEADERS,
    )
    r = client.get(f"/api/v1/programs/{PROGRAM}/balance/{MEMBER}", headers=HEADERS)
    assert r.status_code == 200
    assert r.json()["balance"] == 200


@mock_aws
def test_balance_isolated_by_program(client: TestClient):
    """Points earned in prog-001 should not appear under prog-002."""
    _create_table()
    client.post(
        f"/api/v1/programs/prog-001/earn",
        json={"memberId": MEMBER, "points": 100},
        headers=HEADERS,
    )
    r = client.get(f"/api/v1/programs/prog-002/balance/{MEMBER}", headers=HEADERS)
    assert r.status_code == 200
    assert r.json()["balance"] == 0


# ---------------------------------------------------------------------------
# Burn
# ---------------------------------------------------------------------------

def test_burn_without_tenant_returns_401(client: TestClient):
    r = client.post(f"/api/v1/programs/{PROGRAM}/burn", json={"memberId": MEMBER, "points": 10})
    assert r.status_code == 401


@mock_aws
def test_burn_happy_path(client: TestClient):
    _create_table()
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 200},
        headers=HEADERS,
    )
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/burn",
        json={"memberId": MEMBER, "points": 80},
        headers=HEADERS,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["points"] == 80
    assert data["balance"] == 120
    assert "transactionId" in data


@mock_aws
def test_burn_deducts_from_balance(client: TestClient):
    _create_table()
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 100},
        headers=HEADERS,
    )
    client.post(
        f"/api/v1/programs/{PROGRAM}/burn",
        json={"memberId": MEMBER, "points": 60},
        headers=HEADERS,
    )
    r = client.get(f"/api/v1/programs/{PROGRAM}/balance/{MEMBER}", headers=HEADERS)
    assert r.json()["balance"] == 40


@mock_aws
def test_burn_insufficient_balance_returns_400(client: TestClient):
    _create_table()
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/burn",
        json={"memberId": MEMBER, "points": 999},
        headers=HEADERS,
    )
    assert r.status_code == 400
    error = r.json()["error"]
    assert error["code"] == "BAD_REQUEST"
    assert "Insufficient" in error["message"]


@mock_aws
def test_burn_exact_balance_succeeds(client: TestClient):
    _create_table()
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 50},
        headers=HEADERS,
    )
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/burn",
        json={"memberId": MEMBER, "points": 50},
        headers=HEADERS,
    )
    assert r.status_code == 200
    assert r.json()["balance"] == 0


# ---------------------------------------------------------------------------
# List Transactions
# ---------------------------------------------------------------------------

def test_list_transactions_without_tenant_returns_401(client: TestClient):
    r = client.get(f"/api/v1/programs/{PROGRAM}/transactions")
    assert r.status_code == 401


@mock_aws
def test_list_transactions_empty_for_new_program(client: TestClient):
    _create_table()
    r = client.get(f"/api/v1/programs/{PROGRAM}/transactions", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert "transactions" in data
    assert isinstance(data["transactions"], list)
    assert len(data["transactions"]) == 0


@mock_aws
def test_list_transactions_after_earn_and_burn(client: TestClient):
    _create_table()
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 100},
        headers=HEADERS,
    )
    client.post(
        f"/api/v1/programs/{PROGRAM}/burn",
        json={"memberId": MEMBER, "points": 40},
        headers=HEADERS,
    )
    r = client.get(f"/api/v1/programs/{PROGRAM}/transactions", headers=HEADERS)
    assert r.status_code == 200
    txns = r.json()["transactions"]
    assert len(txns) == 2
    types = {t["type"] for t in txns}
    assert "earn" in types
    assert "burn" in types


@mock_aws
def test_list_transactions_filter_by_member(client: TestClient):
    _create_table()
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": "alice", "points": 50},
        headers=HEADERS,
    )
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": "bob", "points": 60},
        headers=HEADERS,
    )
    r = client.get(
        f"/api/v1/programs/{PROGRAM}/transactions?memberId=alice",
        headers=HEADERS,
    )
    assert r.status_code == 200
    txns = r.json()["transactions"]
    assert len(txns) >= 1
    assert all(t["memberId"] == "alice" for t in txns)


@mock_aws
def test_list_transactions_item_shape(client: TestClient):
    _create_table()
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 25},
        headers=HEADERS,
    )
    r = client.get(f"/api/v1/programs/{PROGRAM}/transactions", headers=HEADERS)
    txn = r.json()["transactions"][0]
    assert "transactionId" in txn
    assert "type" in txn
    assert "memberId" in txn
    assert "points" in txn
    assert "createdAt" in txn
