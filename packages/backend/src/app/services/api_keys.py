"""API key management: create, list, revoke, validate."""

import hashlib
import secrets
import time
from botocore.exceptions import ClientError
from app.db import get_table, get_doc_client, get_table_name, serialize_item, key


def _table():
    return get_table()


def _generate_raw_key() -> str:
    return f"sk_live_{secrets.token_hex(16)}"


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def create_api_key(tenant_id: str, name: str, program_id: str | None = None) -> dict:
    raw_key = _generate_raw_key()
    key_hash = _hash_key(raw_key)
    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    table_name = get_table_name()
    key_prefix = raw_key[:12]
    key_last4 = raw_key[-4:]

    # Atomic write: main record (lookup by hash) + index record (list by tenant)
    get_doc_client().transact_write_items(TransactItems=[
        {
            "Put": {
                "TableName": table_name,
                "Item": serialize_item({
                    "pk": key.api_key_pk(key_hash),
                    "sk": key.API_KEY_SK,
                    "tenantId": tenant_id,
                    "programId": program_id,
                    "name": name,
                    "isActive": True,
                    "createdAt": now,
                    "keyPrefix": key_prefix,
                    "keyLast4": key_last4,
                }),
            }
        },
        {
            "Put": {
                "TableName": table_name,
                "Item": serialize_item({
                    "pk": key.program_pk(tenant_id),
                    "sk": key.api_key_index_sk(key_hash),
                    "name": name,
                    "isActive": True,
                    "createdAt": now,
                    "keyPrefix": key_prefix,
                    "keyLast4": key_last4,
                    "keyHash": key_hash,
                }),
            }
        },
    ])

    return {
        "keyId": key_hash,
        "rawKey": raw_key,
        "name": name,
        "keyPrefix": key_prefix,
        "createdAt": now,
    }


def list_api_keys(tenant_id: str) -> list[dict]:
    pk = key.program_pk(tenant_id)
    result = _table().query(
        KeyConditionExpression="pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues={":pk": pk, ":sk": key.API_KEY_INDEX_SK_PREFIX},
    )
    return [
        {
            "keyId": it.get("keyHash", ""),
            "name": it.get("name", ""),
            "keyPrefix": it.get("keyPrefix", ""),
            "keyLast4": it.get("keyLast4", ""),
            "isActive": it.get("isActive", False),
            "createdAt": it.get("createdAt", ""),
        }
        for it in result.get("Items", [])
    ]


def revoke_api_key(tenant_id: str, key_id: str) -> None:
    tbl = _table()
    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())

    # Deactivate main record
    tbl.update_item(
        Key={"pk": key.api_key_pk(key_id), "sk": key.API_KEY_SK},
        UpdateExpression="SET isActive = :false, revokedAt = :now",
        ExpressionAttributeValues={":false": False, ":now": now},
    )

    # Deactivate index record
    tbl.update_item(
        Key={"pk": key.program_pk(tenant_id), "sk": key.api_key_index_sk(key_id)},
        UpdateExpression="SET isActive = :false",
        ExpressionAttributeValues={":false": False},
    )


def validate_api_key(raw_key: str) -> dict | None:
    key_hash = _hash_key(raw_key)
    tbl = _table()
    result = tbl.get_item(
        Key={"pk": key.api_key_pk(key_hash), "sk": key.API_KEY_SK},
        ProjectionExpression="tenantId, programId, isActive",
    )
    item = result.get("Item")
    if not item:
        return None
    if not item.get("isActive", False):
        return None
    return {
        "tenantId": item["tenantId"],
        "programId": item.get("programId") or "",
    }
