"""Program request/response models."""

from pydantic import BaseModel
from typing import Any


class ProgramCreate(BaseModel):
    name: str | None = "My Program"
    currency: str | None = "INR"


class ProgramUpdate(BaseModel):
    name: str | None = None
    currency: str | None = None
    earnRules: dict[str, Any] | None = None
    burnRules: dict[str, Any] | None = None
    tierConfig: dict[str, Any] | None = None


class ProgramResponse(BaseModel):
    programId: str
    name: str
    currency: str
    earnRules: dict[str, Any] | None = None
    burnRules: dict[str, Any] | None = None
    tierConfig: dict[str, Any] | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


class ProgramListResponse(BaseModel):
    programs: list[ProgramResponse]
