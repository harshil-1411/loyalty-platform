"""Billing request/response models."""

from pydantic import BaseModel


class BillingStatusResponse(BaseModel):
    planId: str | None
    billingStatus: str
    currentPeriodEnd: str | None


class SubscriptionLinkRequest(BaseModel):
    planKey: str = ""
    email: str | None = None


class SubscriptionLinkResponse(BaseModel):
    shortUrl: str
    subscriptionId: str
