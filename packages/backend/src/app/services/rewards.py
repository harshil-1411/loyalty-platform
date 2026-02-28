"""Rewards list, create, redeem."""

import time
import random
import string
from app.db import get_table, key
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
    cost = reward.get("pointsCost", 0)
    balance_sk = key.balance_sk(member_id)
    balance_res = tbl.get_item(Key={"pk": pk, "sk": balance_sk})
    current = balance_res.get("Item", {}).get("points", 0)
    if current < cost:
        raise BadRequestError(f"Insufficient points (balance={current}, required={cost})")
    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    txn_id = _txn_id()
    sk_txn = key.txn_sk(now, txn_id)
    tbl.update_item(
        Key={"pk": pk, "sk": balance_sk},
        UpdateExpression="SET points = points - :cost, updatedAt = :now",
        ExpressionAttributeValues={":cost": cost, ":now": now},
    )
    tbl.put_item(
        Item={
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
        },
    )
    return {"transactionId": txn_id, "rewardId": reward_id, "pointsDeducted": cost, "balance": current - cost}
