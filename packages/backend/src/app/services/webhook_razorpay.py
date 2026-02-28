"""Razorpay webhook: verify signature, update tenant billing, write billing event log."""

import hashlib
import hmac
import json
import time
import uuid
from app.db import get_table, key
from app.secrets import get_razorpay_webhook_secret


def _table():
    return get_table()


def verify_signature(body: str, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def get_tenant_id_from_payload(payload: dict) -> str | None:
    try:
        sub = payload.get("subscription") or {}
        entity = sub.get("entity") if isinstance(sub, dict) else {}
        notes = entity.get("notes") if isinstance(entity, dict) else {}
        if isinstance(notes, dict):
            return notes.get("tenant_id") or notes.get("tenantId")
    except Exception:
        pass
    return None


def _get_tenant_name(tenant_id: str) -> str:
    """Fetch tenant name from DynamoDB for the billing event record."""
    try:
        pk, sk = key.tenant(tenant_id)["pk"], key.tenant(tenant_id)["sk"]
        res = _table().get_item(Key={"pk": pk, "sk": sk}, ProjectionExpression="#n",
                                ExpressionAttributeNames={"#n": "name"})
        return (res.get("Item") or {}).get("name", tenant_id)
    except Exception:
        return tenant_id


def _write_billing_event(tenant_id: str, event_type: str, sub_entity: dict) -> None:
    """Persist a billing event to DynamoDB for the super-admin Billing Overview."""
    try:
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        event_id = uuid.uuid4().hex[:12]
        sk_val = key.billing_event_sk(now, event_id)

        plan_id = ""
        amount = 0
        try:
            plan_id = str(sub_entity.get("plan_id") or "")
            # Razorpay amount is in paise; convert to rupees
            amount = int(sub_entity.get("total_amount") or sub_entity.get("amount") or 0) // 100
        except Exception:
            pass

        tenant_name = _get_tenant_name(tenant_id)

        _table().put_item(Item={
            "pk":         key.BILLING_EVENTS_PK,
            "sk":         sk_val,
            "tenantId":   tenant_id,
            "tenantName": tenant_name,
            "event":      event_type,
            "plan":       plan_id,
            "amount":     amount,
            "createdAt":  now,
        })
    except Exception:
        pass  # Never let event logging break the webhook response


def update_tenant_billing(
    tenant_id: str,
    *,
    billing_status: str | None = None,
    current_period_end: str | None = None,
    razorpay_subscription_id: str | None = None,
) -> None:
    pk, sk = key.tenant(tenant_id)["pk"], key.tenant(tenant_id)["sk"]
    res = _table().get_item(Key={"pk": pk, "sk": sk})
    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    item = res.get("Item") or {}
    item.update({"pk": pk, "sk": sk, "updatedAt": now})
    if "createdAt" not in item:
        item["createdAt"] = now
    if billing_status is not None:
        item["billingStatus"] = billing_status
    if current_period_end is not None:
        item["currentPeriodEnd"] = current_period_end
    if razorpay_subscription_id is not None:
        item["razorpaySubscriptionId"] = razorpay_subscription_id
    _table().put_item(Item=item)


def handle_webhook(raw_body: str, signature: str | None) -> tuple[int, dict]:
    secret = get_razorpay_webhook_secret()
    if not secret or secret == "REPLACE_ME":
        return 500, {"error": "Webhook not configured (set SSM param or RAZORPAY_WEBHOOK_SECRET)"}
    if not signature or not verify_signature(raw_body, signature, secret):
        return 400, {"error": "Invalid signature"}
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        return 400, {"error": "Invalid JSON"}
    event = payload.get("event")
    pl = payload.get("payload") or {}
    tenant_id = get_tenant_id_from_payload(pl)
    if not tenant_id:
        return 200, {"received": True}

    sub_entity = (pl.get("subscription") or {}).get("entity") or {}

    if event in ("subscription.charged", "subscription.activated"):
        current_end = sub_entity.get("current_end")
        current_end_iso = None
        if current_end is not None:
            try:
                current_end_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(int(current_end)))
            except Exception:
                pass
        update_tenant_billing(
            tenant_id,
            billing_status="active",
            current_period_end=current_end_iso,
            razorpay_subscription_id=sub_entity.get("id"),
        )
        _write_billing_event(tenant_id, event, sub_entity)
    elif event in ("subscription.cancelled", "subscription.completed"):
        update_tenant_billing(tenant_id, billing_status="cancelled")
        _write_billing_event(tenant_id, event, sub_entity)
    elif event == "subscription.halted":
        update_tenant_billing(tenant_id, billing_status="past_due")
        _write_billing_event(tenant_id, event, sub_entity)

    return 200, {"received": True}
