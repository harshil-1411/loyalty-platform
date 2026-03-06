"""Rewards list, create, redeem."""

import time
import random
import string
from botocore.exceptions import ClientError
from app.db import get_table, get_doc_client, get_table_name, serialize_item, key
from app.exceptions import BadRequestError, NotFoundError

_TXN_TTL_SECONDS = 18 * 30 * 24 * 3600


def _table():
    return get_table()


def _txn_ttl() -> int:
    return int(time.time()) + _TXN_TTL_SECONDS


def _reward_id() -> str:
    return f"rew_{int(time.time()*1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}"


def _txn_id() -> str:
    return f"txn_{int(time.time()*1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}"


def list_rewards(tenant_id: str, program_id: str) -> list[dict]:
    pk = key.program_scoped_pk(tenant_id, program_id)
    result = _table().query(
        KeyConditionExpression="pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues={":pk": pk, ":sk": key.REWARD_SK_PREFIX},
    )
    items = result.get("Items", [])
    return [
        {
            "rewardId": it["sk"].replace(key.REWARD_SK_PREFIX, ""),
            "name": it.get("name", "Reward"),
            "pointsCost": it.get("pointsCost", 0),
            "tierEligibility": it.get("tierEligibility"),
        }
        for it in items
    ]


def create_reward(tenant_id: str, program_id: str, name: str, points_cost: int) -> dict:
    reward_id = _reward_id()
    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    pk = key.program_scoped_pk(tenant_id, program_id)
    sk = key.reward_sk(reward_id)
    _table().put_item(
        Item={
            "pk": pk,
            "sk": sk,
            "name": name,
            "pointsCost": points_cost,
            "tierEligibility": None,
            "createdAt": now,
            "updatedAt": now,
        },
    )
    return {"rewardId": reward_id, "name": name, "pointsCost": points_cost}


def redeem(tenant_id: str, program_id: str, member_id: str, reward_id: str) -> dict:
    pk = key.program_scoped_pk(tenant_id, program_id)
    tbl = _table()
    reward_res = tbl.get_item(Key={"pk": pk, "sk": key.reward_sk(reward_id)})
    reward = reward_res.get("Item")
    if not reward:
        raise NotFoundError("Reward not found")
    cost = int(reward.get("pointsCost", 0))
    sk_balance = key.balance_sk(member_id)

    # Early check for better error message (not the real guard)
    balance_res = tbl.get_item(Key={"pk": pk, "sk": sk_balance})
    current = int(balance_res.get("Item", {}).get("points", 0))
    if current < cost:
        raise BadRequestError(f"Insufficient points (balance={current}, required={cost})")

    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    txn_id = _txn_id()
    sk_txn = key.txn_sk(now, txn_id)
    table_name = get_table_name()

    try:
        get_doc_client().transact_write_items(TransactItems=[
            {
                "Update": {
                    "TableName": table_name,
                    "Key": {"pk": {"S": pk}, "sk": {"S": sk_balance}},
                    "UpdateExpression": "SET points = points - :cost, updatedAt = :now",
                    "ConditionExpression": "points >= :cost",
                    "ExpressionAttributeValues": {
                        ":cost": {"N": str(cost)},
                        ":now": {"S": now},
                    },
                }
            },
            {
                "Put": {
                    "TableName": table_name,
                    "Item": serialize_item({
                        "pk": pk,
                        "sk": sk_txn,
                        "type": "redemption",
                        "memberId": member_id,
                        "points": cost,
                        "rewardId": reward_id,
                        "createdAt": now,
                        "ttl": _txn_ttl(),
                        "gsi1pk": key.gsi1_tenant(tenant_id),
                        "gsi1sk": key.gsi1_txn_sk(program_id, now, txn_id),
                    }),
                }
            },
        ])
    except ClientError as e:
        if e.response["Error"]["Code"] == "TransactionCanceledException":
            raise BadRequestError(f"Insufficient points (balance={current}, required={cost})")
        raise

    return {"transactionId": txn_id, "rewardId": reward_id, "pointsDeducted": cost, "balance": current - cost}
