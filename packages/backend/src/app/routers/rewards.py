"""Rewards list, create, redeem."""

from fastapi import APIRouter, Depends

from app.deps import get_tenant_id
from app.models.rewards import RewardCreate, RewardResponse, RewardListResponse, RedeemRequest, RedeemResponse
from app.services import rewards as svc

router = APIRouter(prefix="/programs", tags=["Rewards"])


@router.get("/{program_id}/rewards", response_model=RewardListResponse)
def list_rewards(program_id: str, tenant_id: str = Depends(get_tenant_id)):
    items = svc.list_rewards(tenant_id, program_id)
    return RewardListResponse(rewards=[RewardResponse(**x) for x in items])


@router.post("/{program_id}/rewards", response_model=dict, status_code=201)
def create_reward(program_id: str, body: RewardCreate, tenant_id: str = Depends(get_tenant_id)):
    return svc.create_reward(tenant_id, program_id, body.name, body.pointsCost)


@router.post("/{program_id}/redeem", response_model=RedeemResponse)
def redeem(program_id: str, body: RedeemRequest, tenant_id: str = Depends(get_tenant_id)):
    return svc.redeem(tenant_id, program_id, body.memberId, body.rewardId)
