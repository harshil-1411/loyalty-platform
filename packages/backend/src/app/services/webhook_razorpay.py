"""Razorpay webhook: verify signature, update tenant billing."""

import hashlib
import hmac
import json
import time
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
    if event in ("subscription.charged", "subscription.activated"):
        sub = (pl.get("subscription") or {}).get("entity") or {}
        current_end = sub.get("current_end")
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
            razorpay_subscription_id=sub.get("id"),
        )
    elif event in ("subscription.cancelled", "subscription.completed"):
        update_tenant_billing(tenant_id, billing_status="cancelled")
    return 200, {"received": True}
