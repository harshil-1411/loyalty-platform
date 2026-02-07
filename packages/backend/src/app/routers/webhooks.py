"""Razorpay webhook."""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.services import webhook_razorpay as svc

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/razorpay")
async def razorpay_webhook(request: Request):
    body = (await request.body()).decode("utf-8")
    signature = request.headers.get("x-razorpay-signature") or request.headers.get("X-Razorpay-Signature")
    status, data = svc.handle_webhook(body, signature)
    return JSONResponse(status_code=status, content=data)
