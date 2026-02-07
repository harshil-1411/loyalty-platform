"""Reward request/response models."""

from pydantic import BaseModel
from typing import Any


class RewardCreate(BaseModel):
    name: str = "Reward"
    pointsCost: int = 0


class RewardResponse(BaseModel):
    rewardId: str
    name: str
    pointsCost: int
    tierEligibility: Any = None


class RewardListResponse(BaseModel):
    rewards: list[RewardResponse]


class RedeemRequest(BaseModel):
    memberId: str
    rewardId: str


class RedeemResponse(BaseModel):
    transactionId: str
    rewardId: str
    pointsDeducted: int
    balance: int
