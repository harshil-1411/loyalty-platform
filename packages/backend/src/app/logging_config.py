"""Structured logging setup. Request_id and tenant_id are set by middleware."""

import logging
import sys
from typing import Any

from app.config import settings


def configure_logging() -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}',
        datefmt="%Y-%m-%dT%H:%M:%S",
        stream=sys.stdout,
    )
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def log_extra(request_id: str | None = None, tenant_id: str | None = None, **kwargs: Any) -> dict[str, Any]:
    extra: dict[str, Any] = dict(kwargs)
    if request_id is not None:
        extra["request_id"] = request_id
    if tenant_id is not None:
        extra["tenant_id"] = tenant_id
    return extra
