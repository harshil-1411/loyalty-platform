"""Hello endpoint for smoke-test and health check."""

from fastapi import APIRouter

from app.models.hello import HelloResponse

router = APIRouter(tags=["Health"])


@router.get("/hello", response_model=HelloResponse)
def hello() -> HelloResponse:
    """Return a simple message. No auth required."""
    return HelloResponse(message="Hello from Loyalty API")
