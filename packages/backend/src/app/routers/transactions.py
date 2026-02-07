"""Transactions: earn, burn, balance, list."""

from fastapi import APIRouter, Depends, Query

from app.deps import get_tenant_id
from app.models.transactions import (
    EarnRequest,
    BurnRequest,
    BalanceResponse,
    EarnBurnResponse,
    TransactionItem,
    TransactionListResponse,
)
from app.services import transactions as svc

router = APIRouter(prefix="/programs", tags=["Transactions"])


@router.post("/{program_id}/earn", response_model=EarnBurnResponse)
def earn(program_id: str, body: EarnRequest, tenant_id: str = Depends(get_tenant_id)):
    return svc.earn(tenant_id, program_id, body.memberId, body.points, body.idempotencyKey)


@router.post("/{program_id}/burn", response_model=EarnBurnResponse)
def burn(program_id: str, body: BurnRequest, tenant_id: str = Depends(get_tenant_id)):
    return svc.burn(tenant_id, program_id, body.memberId, body.points)


@router.get("/{program_id}/balance/{member_id}", response_model=BalanceResponse)
def get_balance(program_id: str, member_id: str, tenant_id: str = Depends(get_tenant_id)):
    return svc.get_balance(tenant_id, program_id, member_id)


@router.get("/{program_id}/transactions", response_model=TransactionListResponse)
def list_transactions(
    program_id: str,
    tenant_id: str = Depends(get_tenant_id),
    memberId: str | None = Query(None, alias="memberId"),
    limit: int = Query(50, ge=1, le=100),
    nextToken: str | None = Query(None, alias="nextToken"),
):
    items, next_sk = svc.list_transactions(tenant_id, program_id, member_id=memberId, limit=limit, next_token=nextToken)
    return TransactionListResponse(
        transactions=[TransactionItem(**x) for x in items],
        nextToken=next_sk,
    )
