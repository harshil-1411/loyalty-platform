"""Earn, burn, balance, and list transactions."""

import time
import random
import string
from app.db import get_table, key
from app.exceptions import BadRequestError, NotFoundError


def _table():
    return get_table()


def _txn_id() -> str:
    return f"txn_{int(time.time()*1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}"


def earn(tenant_id: str, program_id: str, member_id: str, points: int, idempotency_key: str | None = None) -> dict:
    if points < 0:
        raise BadRequestError("memberId and non-negative points required")
    pk = key.program_scoped_pk(tenant_id, program_id)
    sk_balance = key.balance_sk(member_id)
    txn_id = idempotency_key or _txn_id()
    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    sk_txn = key.txn_sk(now, txn_id)
    tbl = _table()
    tbl.update_item(
        Key={"pk": pk, "sk": sk_balance},
        UpdateExpression="SET points = if_not_exists(points, :zero) + :pts, updatedAt = :now",
        ExpressionAttributeValues={":zero": 0, ":pts": points, ":now": now},
    )
    tbl.put_item(
        Item={
            "pk": pk,
            "sk": sk_txn,
            "type": "earn",
            "memberId": member_id,
            "points": points,
            "idempotencyKey": idempotency_key,
            "createdAt": now,
            "gsi1pk": key.gsi1_tenant(tenant_id),
            "gsi1sk": key.gsi1_txn_sk(program_id, now, txn_id),
        },
    )
    res = tbl.get_item(Key={"pk": pk, "sk": sk_balance})
    balance = res.get("Item", {}).get("points", points)
    return {"transactionId": txn_id, "balance": balance, "points": points}


def burn(tenant_id: str, program_id: str, member_id: str, points: int) -> dict:
    if points < 0:
        raise BadRequestError("memberId and non-negative points required")
    pk = key.program_scoped_pk(tenant_id, program_id)
    sk_balance = key.balance_sk(member_id)
    res = _table().get_item(Key={"pk": pk, "sk": sk_balance})
    current = res.get("Item", {}).get("points", 0)
    if current < points:
        raise BadRequestError(f"Insufficient balance (balance={current})")
    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    txn_id = _txn_id()
    sk_txn = key.txn_sk(now, txn_id)
    tbl = _table()
    tbl.update_item(
        Key={"pk": pk, "sk": sk_balance},
        UpdateExpression="SET points = points - :pts, updatedAt = :now",
        ExpressionAttributeValues={":pts": points, ":now": now},
    )
    tbl.put_item(
        Item={
            "pk": pk,
            "sk": sk_txn,
            "type": "burn",
            "memberId": member_id,
            "points": points,
            "createdAt": now,
            "gsi1pk": key.gsi1_tenant(tenant_id),
            "gsi1sk": key.gsi1_txn_sk(program_id, now, txn_id),
        },
    )
    return {"transactionId": txn_id, "balance": current - points, "points": points}


def get_balance(tenant_id: str, program_id: str, member_id: str) -> dict:
    pk = key.program_scoped_pk(tenant_id, program_id)
    sk = key.balance_sk(member_id)
    res = _table().get_item(Key={"pk": pk, "sk": sk})
    points = res.get("Item", {}).get("points", 0)
    return {"memberId": member_id, "programId": program_id, "balance": points}


def list_transactions(
    tenant_id: str,
    program_id: str,
    member_id: str | None = None,
    limit: int = 50,
    next_token: str | None = None,
) -> tuple[list[dict], str | None]:
    pk = key.program_scoped_pk(tenant_id, program_id)
    params = {
        "KeyConditionExpression": "pk = :pk AND begins_with(sk, :sk)",
        "ExpressionAttributeValues": {":pk": pk, ":sk": key.TXN_SK_PREFIX},
        "Limit": min(limit, 100),
        "ScanIndexForward": False,
    }
    if next_token:
        params["ExclusiveStartKey"] = {"pk": pk, "sk": next_token}
    result = _table().query(**params)
    items = result.get("Items", [])
    next_key = result.get("LastEvaluatedKey")
    next_sk = next_key.get("sk") if next_key else None
    out = []
    for it in items:
        if member_id and it.get("memberId") != member_id:
            continue
        sk = it.get("sk", "")
        txn_id = sk.split("#")[-1] if "#" in sk else ""
        out.append({
            "transactionId": txn_id,
            "type": it.get("type", ""),
            "memberId": it.get("memberId", ""),
            "points": it.get("points", 0),
            "rewardId": it.get("rewardId"),
            "createdAt": it.get("createdAt", ""),
        })
    return out, next_sk
