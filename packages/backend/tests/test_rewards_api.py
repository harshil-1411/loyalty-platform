"""Functional tests for rewards endpoints: list, create, redeem."""

import os
import pytest
import boto3
from fastapi.testclient import TestClient
from moto import mock_aws

TABLE_NAME = "loyalty-test"
TENANT = "test-tenant"
PROGRAM = "prog-001"
MEMBER = "member-001"
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
# List Rewards
# ---------------------------------------------------------------------------

def test_list_rewards_without_tenant_returns_401(client: TestClient):
    r = client.get(f"/api/v1/programs/{PROGRAM}/rewards")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "UNAUTHORIZED"


@mock_aws
def test_list_rewards_empty_initially(client: TestClient):
    _create_table()
    r = client.get(f"/api/v1/programs/{PROGRAM}/rewards", headers=HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert "rewards" in data
    assert isinstance(data["rewards"], list)
    assert len(data["rewards"]) == 0


@mock_aws
def test_list_rewards_returns_created_rewards(client: TestClient):
    _create_table()
    client.post(
        f"/api/v1/programs/{PROGRAM}/rewards",
        json={"name": "Free Coffee", "pointsCost": 100},
        headers=HEADERS,
    )
    client.post(
        f"/api/v1/programs/{PROGRAM}/rewards",
        json={"name": "Discount 20%", "pointsCost": 200},
        headers=HEADERS,
    )
    r = client.get(f"/api/v1/programs/{PROGRAM}/rewards", headers=HEADERS)
    assert r.status_code == 200
    rewards = r.json()["rewards"]
    assert len(rewards) == 2
    names = {rw["name"] for rw in rewards}
    assert "Free Coffee" in names
    assert "Discount 20%" in names


# ---------------------------------------------------------------------------
# Create Reward
# ---------------------------------------------------------------------------

def test_create_reward_without_tenant_returns_401(client: TestClient):
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/rewards",
        json={"name": "Test Reward", "pointsCost": 50},
    )
    assert r.status_code == 401


@mock_aws
def test_create_reward_returns_201(client: TestClient):
    _create_table()
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/rewards",
        json={"name": "Movie Ticket", "pointsCost": 500},
        headers=HEADERS,
    )
    assert r.status_code == 201
    data = r.json()
    assert "rewardId" in data
    assert data["name"] == "Movie Ticket"
    assert data["pointsCost"] == 500


@mock_aws
def test_create_reward_default_fields(client: TestClient):
    """Default name and pointsCost when not provided."""
    _create_table()
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/rewards",
        json={},
        headers=HEADERS,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Reward"
    assert data["pointsCost"] == 0


@mock_aws
def test_create_reward_appears_in_list(client: TestClient):
    _create_table()
    create_r = client.post(
        f"/api/v1/programs/{PROGRAM}/rewards",
        json={"name": "Gold Badge", "pointsCost": 300},
        headers=HEADERS,
    )
    reward_id = create_r.json()["rewardId"]

    list_r = client.get(f"/api/v1/programs/{PROGRAM}/rewards", headers=HEADERS)
    reward_ids = [rw["rewardId"] for rw in list_r.json()["rewards"]]
    assert reward_id in reward_ids


@mock_aws
def test_create_reward_item_shape(client: TestClient):
    _create_table()
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/rewards",
        json={"name": "Voucher", "pointsCost": 150},
        headers=HEADERS,
    )
    data = r.json()
    assert "rewardId" in data
    assert "name" in data
    assert "pointsCost" in data


# ---------------------------------------------------------------------------
# Redeem
# ---------------------------------------------------------------------------

def test_redeem_without_tenant_returns_401(client: TestClient):
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/redeem",
        json={"memberId": MEMBER, "rewardId": "rew_fake"},
    )
    assert r.status_code == 401


@mock_aws
def test_redeem_reward_not_found_returns_404(client: TestClient):
    _create_table()
    r = client.post(
        f"/api/v1/programs/{PROGRAM}/redeem",
        json={"memberId": MEMBER, "rewardId": "nonexistent-reward"},
        headers=HEADERS,
    )
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


@mock_aws
def test_redeem_insufficient_points_returns_400(client: TestClient):
    _create_table()
    # Create a reward worth 500 pts
    create_r = client.post(
        f"/api/v1/programs/{PROGRAM}/rewards",
        json={"name": "Expensive Prize", "pointsCost": 500},
        headers=HEADERS,
    )
    reward_id = create_r.json()["rewardId"]

    # Member has only 100 pts
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 100},
        headers=HEADERS,
    )

    r = client.post(
        f"/api/v1/programs/{PROGRAM}/redeem",
        json={"memberId": MEMBER, "rewardId": reward_id},
        headers=HEADERS,
    )
    assert r.status_code == 400
    error = r.json()["error"]
    assert error["code"] == "BAD_REQUEST"
    assert "Insufficient" in error["message"]


@mock_aws
def test_redeem_happy_path(client: TestClient):
    _create_table()
    # Create reward
    create_r = client.post(
        f"/api/v1/programs/{PROGRAM}/rewards",
        json={"name": "Free Coffee", "pointsCost": 100},
        headers=HEADERS,
    )
    reward_id = create_r.json()["rewardId"]

    # Give member 300 pts
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 300},
        headers=HEADERS,
    )

    r = client.post(
        f"/api/v1/programs/{PROGRAM}/redeem",
        json={"memberId": MEMBER, "rewardId": reward_id},
        headers=HEADERS,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["rewardId"] == reward_id
    assert data["pointsDeducted"] == 100
    assert data["balance"] == 200
    assert "transactionId" in data


@mock_aws
def test_redeem_deducts_balance(client: TestClient):
    _create_table()
    create_r = client.post(
        f"/api/v1/programs/{PROGRAM}/rewards",
        json={"name": "Prize", "pointsCost": 50},
        headers=HEADERS,
    )
    reward_id = create_r.json()["rewardId"]
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 200},
        headers=HEADERS,
    )
    client.post(
        f"/api/v1/programs/{PROGRAM}/redeem",
        json={"memberId": MEMBER, "rewardId": reward_id},
        headers=HEADERS,
    )
    r = client.get(f"/api/v1/programs/{PROGRAM}/balance/{MEMBER}", headers=HEADERS)
    assert r.json()["balance"] == 150


@mock_aws
def test_redeem_creates_redemption_transaction(client: TestClient):
    _create_table()
    create_r = client.post(
        f"/api/v1/programs/{PROGRAM}/rewards",
        json={"name": "Badge", "pointsCost": 25},
        headers=HEADERS,
    )
    reward_id = create_r.json()["rewardId"]
    client.post(
        f"/api/v1/programs/{PROGRAM}/earn",
        json={"memberId": MEMBER, "points": 100},
        headers=HEADERS,
    )
    client.post(
        f"/api/v1/programs/{PROGRAM}/redeem",
        json={"memberId": MEMBER, "rewardId": reward_id},
        headers=HEADERS,
    )
    r = client.get(f"/api/v1/programs/{PROGRAM}/transactions", headers=HEADERS)
    txns = r.json()["transactions"]
    redemptions = [t for t in txns if t["type"] == "redemption"]
    assert len(redemptions) == 1
    assert redemptions[0]["rewardId"] == reward_id
