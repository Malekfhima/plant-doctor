from uuid import UUID

import httpx
import structlog
from postgrest.exceptions import APIError
from supabase import AsyncClient

from app.core.errors import AppError, ErrorCode


class QuotaRepository:
    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def reserve_daily_scan_quota(self, user_id: UUID, daily_limit: int) -> None:
        try:
            await self._client.rpc(
                "reserve_daily_scan_quota",
                {
                    "p_user_id": str(user_id),
                    "p_daily_quota": daily_limit,
                },
            ).execute()
        except APIError as exc:
            if "DAILY_QUOTA_EXCEEDED" in str(exc):
                raise AppError(
                    ErrorCode.QUOTA_EXCEEDED,
                    "The daily scan quota has been reached.",
                    status_code=429,
                ) from exc
            structlog.get_logger(__name__).error(
                "supabase_quota_request_failed",
                exception_type=type(exc).__name__,
            )
            raise AppError(
                ErrorCode.SUPABASE_UNAVAILABLE,
                "The daily scan quota could not be checked.",
                status_code=503,
            ) from exc
        except httpx.HTTPError as exc:
            structlog.get_logger(__name__).error(
                "supabase_quota_request_failed",
                exception_type=type(exc).__name__,
            )
            raise AppError(
                ErrorCode.SUPABASE_UNAVAILABLE,
                "The daily scan quota could not be checked.",
                status_code=503,
            ) from exc
