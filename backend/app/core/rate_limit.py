from starlette.requests import Request
from slowapi import Limiter

from app.core.config import get_settings


def rate_limit_key(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    client = request.client
    return f"ip:{client.host if client is not None else 'unknown'}"


limiter = Limiter(
    key_func=rate_limit_key,
    storage_uri=get_settings().rate_limit_storage_uri,
    headers_enabled=True,
)
