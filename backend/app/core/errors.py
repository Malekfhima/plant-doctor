from enum import StrEnum
from time import perf_counter

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException


class ErrorCode(StrEnum):
    IMAGE_INVALID = "IMAGE_INVALID"
    IMAGE_TOO_LARGE = "IMAGE_TOO_LARGE"
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT"
    NOT_A_PLANT = "NOT_A_PLANT"
    LLM_TIMEOUT = "LLM_TIMEOUT"
    LLM_INVALID_RESPONSE = "LLM_INVALID_RESPONSE"
    LLM_UPSTREAM_ERROR = "LLM_UPSTREAM_ERROR"
    LLM_PROVIDER_UNAVAILABLE = "LLM_PROVIDER_UNAVAILABLE"
    SUPABASE_UNAVAILABLE = "SUPABASE_UNAVAILABLE"
    RATE_LIMITED = "RATE_LIMITED"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    UNAUTHORIZED = "UNAUTHORIZED"
    NOT_FOUND = "NOT_FOUND"
    AUTHENTICATION_NOT_CONFIGURED = "AUTHENTICATION_NOT_CONFIGURED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    HTTP_ERROR = "HTTP_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class AppError(Exception):
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status_code: int,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def _error_response(
    request: Request,
    *,
    code: ErrorCode,
    message: str,
    status_code: int,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    started_at = getattr(request.state, "request_started_at", None)
    duration_ms = (
        round((perf_counter() - started_at) * 1000, 2)
        if started_at is not None
        else None
    )
    structlog.get_logger("http").info(
        "http_request_complete",
        request_id=_request_id(request),
        user_id=getattr(request.state, "user_id", None),
        status_code=status_code,
        duration_ms=duration_ms,
    )
    response_headers = {
        "X-Request-ID": _request_id(request),
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
    }
    if headers:
        response_headers.update(headers)
    return JSONResponse(
        status_code=status_code,
        headers=response_headers,
        content={
            "error": {
                "code": code.value,
                "message": message,
                "request_id": _request_id(request),
            }
        },
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return _error_response(
        request,
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    if exc.status_code == 401:
        code = ErrorCode.UNAUTHORIZED
        message = "Authentication is required."
    elif exc.status_code == 404:
        code = ErrorCode.NOT_FOUND
        message = "The requested resource was not found."
    elif exc.status_code == 429:
        code = ErrorCode.RATE_LIMITED
        message = "Too many requests."
    else:
        code = ErrorCode.HTTP_ERROR
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
    return _error_response(
        request,
        code=code,
        message=message,
        status_code=exc.status_code,
        headers=exc.headers,
    )


async def validation_exception_handler(
    request: Request, _exc: RequestValidationError
) -> JSONResponse:
    return _error_response(
        request,
        code=ErrorCode.VALIDATION_ERROR,
        message="The request does not match the expected format.",
        status_code=422,
    )


async def rate_limit_exception_handler(
    request: Request, _exc: RateLimitExceeded
) -> JSONResponse:
    return _error_response(
        request,
        code=ErrorCode.RATE_LIMITED,
        message="Too many requests.",
        status_code=429,
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    structlog.get_logger(__name__).error(
        "unhandled_exception",
        request_id=_request_id(request),
        exception_type=type(exc).__name__,
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    return _error_response(
        request,
        code=ErrorCode.INTERNAL_ERROR,
        message="An unexpected error occurred.",
        status_code=500,
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
