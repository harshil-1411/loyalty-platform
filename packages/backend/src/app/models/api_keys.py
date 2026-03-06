"""API key request/response models."""

from pydantic import BaseModel


class CreateApiKeyRequest(BaseModel):
    name: str
    programId: str | None = None


class CreateApiKeyResponse(BaseModel):
    keyId: str
    rawKey: str
    name: str
    keyPrefix: str
    createdAt: str


class ApiKeyResponse(BaseModel):
    keyId: str
    name: str
    keyPrefix: str
    keyLast4: str
    isActive: bool
    createdAt: str


class ApiKeyListResponse(BaseModel):
    apiKeys: list[ApiKeyResponse]
