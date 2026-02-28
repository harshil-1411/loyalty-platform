"""FastAPI application and Mangum handler for Lambda."""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.exceptions import (
    ErrorDetail,
    ErrorResponse,
    UnauthorizedError,
    NotFoundError,
    ForbiddenError,
    BadRequestError,
    ConflictError,
)
from app.logging_config import configure_logging
from app.routers import hello, programs, transactions, rewards, billing, webhooks, me, superadmin

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.table_name:
        logger.warning("TABLE_NAME not set; DynamoDB operations will fail")
    yield


def _error_response(status_code: int, code: str, message: str, request_id: str | None = None) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorDetail(code=code, message=message),
        request_id=request_id,
    )
    return JSONResponse(status_code=status_code, content=body.model_dump())


async def _set_tenant_from_authorizer(request: Request, call_next):
    """When behind API Gateway Lambda authorizer, set request.state.tenant_id from authorizer context."""
    event = request.scope.get("aws.event")
    if event:
        try:
            authorizer = (event.get("requestContext") or {}).get("authorizer") or {}
            # HTTP API Lambda authorizer context: tenantId may be top-level or under .lambda
            tenant = authorizer.get("tenantId") or authorizer.get("tenant_id")
            if not tenant and isinstance(authorizer.get("lambda"), dict):
                tenant = authorizer["lambda"].get("tenantId") or authorizer["lambda"].get("tenant_id")
            if tenant:
                request.state.tenant_id = tenant if isinstance(tenant, str) else str(tenant)
            user_sub = authorizer.get("sub") or (isinstance(authorizer.get("lambda"), dict) and authorizer["lambda"].get("sub"))
            if user_sub:
                request.state.user_sub = user_sub if isinstance(user_sub, str) else str(user_sub)
            cognito_username = authorizer.get("cognito_username") or (isinstance(authorizer.get("lambda"), dict) and authorizer["lambda"].get("cognito_username"))
            if cognito_username:
                request.state.cognito_username = cognito_username if isinstance(cognito_username, str) else str(cognito_username)
            groups_raw = authorizer.get("cognito_groups") or (isinstance(authorizer.get("lambda"), dict) and authorizer["lambda"].get("cognito_groups"))
            if groups_raw is not None:
                # Authorizer sends groups as comma-separated string (API GW context only allows scalars)
                if isinstance(groups_raw, str):
                    request.state.cognito_groups = [g for g in groups_raw.split(",") if g]
                elif isinstance(groups_raw, list):
                    request.state.cognito_groups = groups_raw
                else:
                    request.state.cognito_groups = []
        except Exception:  # noqa: BLE001
            pass
    return await call_next(request)


async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()
    response = await _set_tenant_from_authorizer(request, call_next)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "request_finished",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration_ms, 2),
        },
    )
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


from slowapi import Limiter

_default_limit = f"{settings.rate_limit_requests}/{settings.rate_limit_window_sec}second"
if settings.rate_limit_window_sec >= 60:
    _default_limit = f"{settings.rate_limit_requests}/{settings.rate_limit_window_sec // 60}minute"
limiter = Limiter(key_func=get_remote_address, default_limits=[_default_limit])

app = FastAPI(
    title="Loyalty Platform API",
    description="REST API for the Loyalty Management Platform. OpenAPI spec is exported for MCP and CodePlugins.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json",
)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.middleware("http")(add_request_id)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    request_id = getattr(request.state, "request_id", None)
    response = _error_response(429, "RATE_LIMIT_EXCEEDED", "Too many requests", request_id)
    response.headers["Retry-After"] = str(settings.rate_limit_window_sec)
    return response


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


@app.exception_handler(UnauthorizedError)
async def unauthorized_handler(request: Request, exc: UnauthorizedError):
    request_id = getattr(request.state, "request_id", None)
    logger.warning("unauthorized", extra={"request_id": request_id, "path": request.url.path})
    return _error_response(401, "UNAUTHORIZED", str(exc), request_id)


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    request_id = getattr(request.state, "request_id", None)
    return _error_response(404, "NOT_FOUND", str(exc), request_id)


@app.exception_handler(ForbiddenError)
async def forbidden_handler(request: Request, exc: ForbiddenError):
    request_id = getattr(request.state, "request_id", None)
    return _error_response(403, "FORBIDDEN", str(exc), request_id)


@app.exception_handler(BadRequestError)
async def bad_request_handler(request: Request, exc: BadRequestError):
    request_id = getattr(request.state, "request_id", None)
    return _error_response(400, "BAD_REQUEST", str(exc), request_id)


@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError):
    request_id = getattr(request.state, "request_id", None)
    return _error_response(409, "CONFLICT", str(exc), request_id)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    msg = "Validation error: " + "; ".join(
        f"{e['loc']}: {e['msg']}" for e in exc.errors()
    )
    return _error_response(422, "VALIDATION_ERROR", msg, request_id)


@app.exception_handler(Exception)
async def generic_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.exception("unhandled_exception", extra={"request_id": request_id, "path": request.url.path})
    return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred", request_id)


app.include_router(hello.router, prefix=settings.api_base_path)
app.include_router(programs.router, prefix=settings.api_base_path)
app.include_router(transactions.router, prefix=settings.api_base_path)
app.include_router(rewards.router, prefix=settings.api_base_path)
app.include_router(billing.router, prefix=settings.api_base_path)
app.include_router(webhooks.router, prefix=settings.api_base_path)
app.include_router(me.router, prefix=settings.api_base_path)
app.include_router(superadmin.router, prefix=settings.api_base_path)


def get_mangum_handler():
    from mangum import Mangum
    return Mangum(app, lifespan="off")


handler = get_mangum_handler()
