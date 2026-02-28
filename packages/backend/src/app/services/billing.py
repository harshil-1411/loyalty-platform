"""Billing status and subscription link (Razorpay)."""

import base64
import json
import urllib.request
from app.db import get_table, key
from app.secrets import get_razorpay_key_id, get_razorpay_key_secret, get_razorpay_plan_id


def _table():
    return get_table()


def get_billing_status(tenant_id: str) -> dict:
    pk, sk = key.tenant(tenant_id)["pk"], key.tenant(tenant_id)["sk"]
    res = _table().get_item(Key={"pk": pk, "sk": sk})
    item = res.get("Item") or {}
    return {
        "planId": item.get("planId"),
        "billingStatus": item.get("billingStatus", "none"),
        "currentPeriodEnd": item.get("currentPeriodEnd"),
    }


def create_subscription_link(tenant_id: str, plan_key: str, email: str | None = None) -> dict:
    plan_id = get_razorpay_plan_id(plan_key)
    if not plan_id:
        raise ValueError("Invalid or missing planKey (starter|growth|scale)")
    key_id = get_razorpay_key_id()
    key_secret = get_razorpay_key_secret()
    if not key_id or not key_secret:
        raise RuntimeError("Razorpay keys not configured (set SSM params or RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)")
    auth = base64.b64encode(f"{key_id}:{key_secret}".encode()).decode()
    body = {"plan_id": plan_id, "total_count": 12, "quantity": 1, "notes": {"tenant_id": tenant_id}, "customer_notify": 1}
    req = urllib.request.Request(
        "https://api.razorpay.com/v1/subscriptions",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    return {"shortUrl": data.get("short_url", ""), "subscriptionId": data.get("id", "")}
