"""Earn, burn, balance, and list transactions."""

import time
import random
import string
from botocore.exceptions import ClientError
from app.db import get_table, get_doc_client, get_table_name, serialize_item, key
from app.exceptions import BadRequestError, ConflictError

# Transaction items expire after 18 months (DynamoDB TTL attribute)
_TXN_TTL_SECONDS = 18 * 30 * 24 * 3600

# Idempotency records expire after 7 days
_IDEM_TTL_SECONDS = 7 * 24 * 3600


def _table():
    return get_table()


def _txn_id() -> str:
    return f"txn_{int(time.time()*1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}"


def _txn_ttl() -> int:
    return int(time.time()) + _TXN_TTL_SECONDS


def _idem_ttl() -> int:
    return int(time.time()) + _IDEM_TTL_SECONDS


def earn(tenant_id: str, program_id: str, member_id: str, points: int, idempotency_key: str | None = None) -> dict:
    if points < 0:
        raise BadRequestError("memberId and non-negative points required")
    pk = key.program_scoped_pk(tenant_id, program_id)
    sk_balance = key.balance_sk(member_id)
    txn_id = idempotency_key or _txn_id()
    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    sk_txn = key.txn_sk(now, txn_id)
    table_name = get_table_name()
    tbl = _table()

    # Build atomic transaction: balance update + transaction record
    items = [
        {
            "Update": {
                "TableName": table_name,
                "Key": {"pk": {"S": pk}, "sk": {"S": sk_balance}},
                "UpdateExpression": "SET points = if_not_exists(points, :zero) + :pts, updatedAt = :now",
                "ExpressionAttributeValues": {
                    ":zero": {"N": "0"},
                    ":pts": {"N": str(points)},
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
                    "type": "earn",
                    "memberId": member_id,
                    "points": points,
                    "createdAt": now,
                    "ttl": _txn_ttl(),
                    "gsi1pk": key.gsi1_tenant(tenant_id),
                    "gsi1sk": key.gsi1_txn_sk(program_id, now, txn_id),
                }),
            }
        },
    ]

    # Idempotency guard: IDEM record with ConditionExpression rejects duplicates
    if idempotency_key:
        items.append({
            "Put": {
                "TableName": table_name,
                "Item": serialize_item({
                    "pk": pk,
                    "sk": key.idem_sk(idempotency_key),
                    "type": "earn",
                    "memberId": member_id,
                    "points": points,
                    "createdAt": now,
                    "ttl": _idem_ttl(),
                }),
                "ConditionExpression": "attribute_not_exists(sk)",
            }
        })

    try:
        get_doc_client().transact_write_items(TransactItems=items)
    except ClientError as e:
        if e.response["Error"]["Code"] == "TransactionCanceledException" and idempotency_key:
            # Duplicate detected — look up existing IDEM record
            existing = tbl.get_item(Key={"pk": pk, "sk": key.idem_sk(idempotency_key)})
            item = existing.get("Item")
            if item:
                if item.get("memberId") != member_id or int(item.get("points", -1)) != points:
                    raise ConflictError("Idempotency key already used with different parameters")
                # Return cached response (balance unchanged since earn was not re-applied)
                cached_balance = item.get("balance")
                if cached_balance is not None:
                    return {"transactionId": idempotency_key, "balance": int(cached_balance), "points": points}
                bal_res = tbl.get_item(Key={"pk": pk, "sk": sk_balance})
                return {"transactionId": idempotency_key, "balance": int(bal_res.get("Item", {}).get("points", 0)), "points": points}
        raise

    # Read updated balance
    res = tbl.get_item(Key={"pk": pk, "sk": sk_balance})
    balance = int(res.get("Item", {}).get("points", points))

    # Store balance in IDEM record for future duplicate responses (fire-and-forget)
    if idempotency_key:
        try:
            tbl.update_item(
                Key={"pk": pk, "sk": key.idem_sk(idempotency_key)},
                UpdateExpression="SET balance = :bal",
                ExpressionAttributeValues={":bal": balance},
            )
        except Exception:
            pass

    return {"transactionId": txn_id, "balance": balance, "points": points}


def burn(tenant_id: str, program_id: str, member_id: str, points: int) -> dict:
    if points < 0:
        raise BadRequestError("memberId and non-negative points required")
    pk = key.program_scoped_pk(tenant_id, program_id)
    sk_balance = key.balance_sk(member_id)
    tbl = _table()

    # Early check for better error message (not the real guard)
    res = tbl.get_item(Key={"pk": pk, "sk": sk_balance})
    current = int(res.get("Item", {}).get("points", 0))
    if current < points:
        raise BadRequestError(f"Insufficient balance (balance={current})")

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
                    "UpdateExpression": "SET points = points - :pts, updatedAt = :now",
                    "ConditionExpression": "points >= :pts",
                    "ExpressionAttributeValues": {
                        ":pts": {"N": str(points)},
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
                        "type": "burn",
                        "memberId": member_id,
                        "points": points,
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
            raise BadRequestError("Insufficient balance")
        raise

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
