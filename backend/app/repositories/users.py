from typing import Any
from uuid import UUID

import httpx
import structlog
from postgrest.exceptions import APIError
from storage3.utils import StorageException
from supabase import AsyncClient
from supabase_auth.errors import AuthApiError

from app.core.errors import AppError, ErrorCode
from app.repositories.scans import BUCKET_NAME


ACCOUNT_DELETE_PAGE_SIZE = 500
STORAGE_DELETE_BATCH_SIZE = 100


class UserRepository:
    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def get_profile(self, user_id: UUID) -> dict[str, Any]:
        try:
            response = (
                await self._client.table("profiles")
                .select("*")
                .eq("id", str(user_id))
                .limit(1)
                .execute()
            )
            if response.data:
                return response.data[0]
            created = await self._client.table("profiles").upsert(
                {"id": str(user_id)},
                on_conflict="id",
            ).execute()
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        if not created.data:
            raise self._database_error(
                RuntimeError("Supabase returned no row for the profile.")
            )
        return created.data[0]

    async def update_profile(
        self,
        user_id: UUID,
        values: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            response = (
                await self._client.table("profiles")
                .update(values)
                .eq("id", str(user_id))
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        if not response.data:
            return await self.get_profile(user_id)
        return response.data[0]

    async def delete_user(self, user_id: UUID) -> None:
        paths = await self._list_scan_image_paths(user_id)
        for offset in range(0, len(paths), STORAGE_DELETE_BATCH_SIZE):
            batch = paths[offset : offset + STORAGE_DELETE_BATCH_SIZE]
            try:
                await self._client.storage.from_(BUCKET_NAME).remove(batch)
            except (StorageException, httpx.HTTPError) as exc:
                raise self._storage_error(exc) from exc

        try:
            await self._client.auth.admin.delete_user(str(user_id))
        except (AuthApiError, httpx.HTTPError) as exc:
            structlog.get_logger(__name__).error(
                "supabase_account_deletion_failed",
                user_id=str(user_id),
                exception_type=type(exc).__name__,
            )
            raise AppError(
                ErrorCode.SUPABASE_UNAVAILABLE,
                "The account could not be deleted.",
                status_code=503,
            ) from exc

    async def _list_scan_image_paths(self, user_id: UUID) -> list[str]:
        paths: list[str] = []
        offset = 0
        while True:
            try:
                response = (
                    await self._client.table("scans")
                    .select("image_path")
                    .eq("user_id", str(user_id))
                    .order("created_at")
                    .order("id")
                    .range(offset, offset + ACCOUNT_DELETE_PAGE_SIZE - 1)
                    .execute()
                )
            except (APIError, httpx.HTTPError) as exc:
                raise self._database_error(exc) from exc

            page = response.data
            paths.extend(row["image_path"] for row in page)
            if len(page) < ACCOUNT_DELETE_PAGE_SIZE:
                return paths
            offset += ACCOUNT_DELETE_PAGE_SIZE

    @staticmethod
    def _database_error(exc: Exception) -> AppError:
        structlog.get_logger(__name__).error(
            "supabase_database_request_failed",
            exception_type=type(exc).__name__,
        )
        return AppError(
            ErrorCode.SUPABASE_UNAVAILABLE,
            "The database request could not be completed.",
            status_code=503,
        )

    @staticmethod
    def _storage_error(exc: Exception) -> AppError:
        structlog.get_logger(__name__).error(
            "supabase_storage_request_failed",
            exception_type=type(exc).__name__,
        )
        return AppError(
            ErrorCode.SUPABASE_UNAVAILABLE,
            "The image storage request could not be completed.",
            status_code=503,
        )
