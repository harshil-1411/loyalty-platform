"""Custom exceptions and error response schema for the API."""

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
    request_id: str | None = None


class UnauthorizedError(Exception):
    """Raised when tenant or auth is missing/invalid."""
    pass


class NotFoundError(Exception):
    """Raised when a resource is not found."""
    pass


class ForbiddenError(Exception):
    """Raised when tenant does not have access to resource."""
    pass


class BadRequestError(Exception):
    """Raised for invalid client input."""
    pass


class ConflictError(Exception):
    """Raised for conflict (e.g. duplicate)."""
    pass
