"""Program CRUD service."""

import time
from app.db import get_table, key
from app.exceptions import NotFoundError


def _table():
    return get_table()


def list_programs(tenant_id: str) -> list[dict]:
    pk = key.program_pk(tenant_id)
    result = _table().query(
        KeyConditionExpression="pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues={":pk": pk, ":sk": key.program_sk_prefix()},
    )
    items = result.get("Items", [])
    return [
        {
            "programId": it["sk"].replace(key.program_sk_prefix(), ""),
            "name": it.get("name", ""),
            "currency": it.get("currency", "INR"),
            "earnRules": it.get("earnRules"),
            "burnRules": it.get("burnRules"),
            "tierConfig": it.get("tierConfig"),
            "createdAt": it.get("createdAt"),
            "updatedAt": it.get("updatedAt"),
        }
        for it in items
    ]


def get_program(tenant_id: str, program_id: str) -> dict | None:
    pk, sk = key.program(tenant_id, program_id)["pk"], key.program(tenant_id, program_id)["sk"]
    result = _table().get_item(Key={"pk": pk, "sk": sk})
    item = result.get("Item")
    if not item:
        return None
    return {
        "programId": item["sk"].replace(key.program_sk_prefix(), ""),
        "name": item.get("name", ""),
        "currency": item.get("currency", "INR"),
        "earnRules": item.get("earnRules"),
        "burnRules": item.get("burnRules"),
        "tierConfig": item.get("tierConfig"),
        "createdAt": item.get("createdAt"),
        "updatedAt": item.get("updatedAt"),
    }


def create_program(tenant_id: str, name: str, currency: str) -> dict:
    program_id = f"prog_{int(time.time() * 1000)}_{__import__('random').randbytes(4).hex()}"
    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    pk, sk = key.program(tenant_id, program_id)["pk"], key.program(tenant_id, program_id)["sk"]
    _table().put_item(
        Item={
            "pk": pk,
            "sk": sk,
            "name": name,
            "currency": currency,
            "earnRules": {},
            "burnRules": {},
            "tierConfig": {},
            "createdAt": now,
            "updatedAt": now,
        },
    )
    return {"programId": program_id, "name": name, "currency": currency}


def update_program(
    tenant_id: str,
    program_id: str,
    *,
    name: str | None = None,
    currency: str | None = None,
    earn_rules: dict | None = None,
    burn_rules: dict | None = None,
    tier_config: dict | None = None,
) -> dict:
    existing = get_program(tenant_id, program_id)
    if not existing:
        raise NotFoundError("Program not found")
    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    pk, sk = key.program(tenant_id, program_id)["pk"], key.program(tenant_id, program_id)["sk"]
    item = {
        "pk": pk,
        "sk": sk,
        "name": name if name is not None else existing["name"],
        "currency": currency if currency is not None else existing["currency"],
        "earnRules": earn_rules if earn_rules is not None else existing.get("earnRules", {}),
        "burnRules": burn_rules if burn_rules is not None else existing.get("burnRules", {}),
        "tierConfig": tier_config if tier_config is not None else existing.get("tierConfig", {}),
        "createdAt": existing.get("createdAt", now),
        "updatedAt": now,
    }
    _table().put_item(Item=item)
    return {"programId": program_id, "updatedAt": now}
