"""Resolve secrets from env or SSM (for Lambda). Caches SSM values in memory."""
import os
from functools import lru_cache

from app.config import settings


def _get_ssm_param(param_name: str) -> str:
    try:
        import boto3
        client = boto3.client("ssm")
        resp = client.get_parameter(Name=param_name, WithDecryption=True)
        return (resp.get("Parameter") or {}).get("Value") or ""
    except Exception:
        return ""


@lru_cache(maxsize=1)
def _cached_webhook_secret() -> str:
    """Fetch webhook secret once: env RAZORPAY_WEBHOOK_SECRET else SSM from RAZORPAY_WEBHOOK_SECRET_PARAM."""
    v = (getattr(settings, "razorpay_webhook_secret", None) or os.environ.get("RAZORPAY_WEBHOOK_SECRET") or "").strip()
    if v:
        return v
    param_name = os.environ.get("RAZORPAY_WEBHOOK_SECRET_PARAM", "").strip()
    if param_name:
        return _get_ssm_param(param_name)
    return ""


def get_razorpay_webhook_secret() -> str:
    return _cached_webhook_secret()


@lru_cache(maxsize=1)
def _cached_key_id() -> str:
    v = (getattr(settings, "razorpay_key_id", None) or os.environ.get("RAZORPAY_KEY_ID") or "").strip()
    if v:
        return v
    param_name = os.environ.get("RAZORPAY_KEY_ID_PARAM", "").strip()
    if param_name:
        return _get_ssm_param(param_name)
    return ""


@lru_cache(maxsize=1)
def _cached_key_secret() -> str:
    v = (getattr(settings, "razorpay_key_secret", None) or os.environ.get("RAZORPAY_KEY_SECRET") or "").strip()
    if v:
        return v
    param_name = os.environ.get("RAZORPAY_KEY_SECRET_PARAM", "").strip()
    if param_name:
        return _get_ssm_param(param_name)
    return ""


def get_razorpay_key_id() -> str:
    return _cached_key_id()


def get_razorpay_key_secret() -> str:
    return _cached_key_secret()
