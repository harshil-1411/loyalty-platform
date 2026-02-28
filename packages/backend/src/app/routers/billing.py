"""Billing status and subscription link."""

import urllib.error

from fastapi import APIRouter, Depends

from app.deps import get_tenant_id
from app.models.billing import BillingStatusResponse, SubscriptionLinkRequest, SubscriptionLinkResponse
from app.services import billing as svc
from app.exceptions import BadRequestError

router = APIRouter(prefix="/billing", tags=["Billing"])


@router.get("/status", response_model=BillingStatusResponse)
def get_billing_status(tenant_id: str = Depends(get_tenant_id)):
    return svc.get_billing_status(tenant_id)


@router.post("/subscription-link", response_model=SubscriptionLinkResponse, status_code=201)
def create_subscription_link(body: SubscriptionLinkRequest, tenant_id: str = Depends(get_tenant_id)):
    try:
        return svc.create_subscription_link(tenant_id, body.planKey or "", body.email)
    except ValueError as e:
        raise BadRequestError(str(e))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        raise BadRequestError(f"Payment gateway error: {detail}")
    except Exception as e:
        raise BadRequestError(str(e))
