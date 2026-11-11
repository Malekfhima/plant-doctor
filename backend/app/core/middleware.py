from time import perf_counter
from uuid import UUID, uuid4

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        supplied_id = request.headers.get("x-request-id")
        try:
            request_id = str(UUID(supplied_id)) if supplied_id else str(uuid4())
        except ValueError:
            request_id = str(uuid4())

        started_at = perf_counter()
        request.state.request_id = request_id
        request.state.request_started_at = started_at
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        try:
            response = await call_next(request)
            if response.status_code < 400:
                structlog.get_logger(__name__).info(
                    "http_request_complete",
                    user_id=getattr(request.state, "user_id", None),
                    status_code=response.status_code,
                    duration_ms=round((perf_counter() - started_at) * 1000, 2),
                )
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["Permissions-Policy"] = (
                "camera=(self), microphone=(), geolocation=()"
            )
            return response
        finally:
            structlog.contextvars.clear_contextvars()
