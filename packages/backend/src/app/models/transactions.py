"""Transaction request/response models."""

from pydantic import BaseModel


class EarnRequest(BaseModel):
    memberId: str
    points: int
    idempotencyKey: str | None = None


class BurnRequest(BaseModel):
    memberId: str
    points: int


class BalanceResponse(BaseModel):
    memberId: str
    programId: str
    balance: int


class EarnBurnResponse(BaseModel):
    transactionId: str
    balance: int
    points: int


class TransactionItem(BaseModel):
    transactionId: str
    type: str
    memberId: str
    points: int
    rewardId: str | None = None
    createdAt: str


class TransactionListResponse(BaseModel):
    transactions: list[TransactionItem]
    nextToken: str | None = None
