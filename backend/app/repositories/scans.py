from typing import Any
from uuid import UUID

import httpx
import structlog
from postgrest.exceptions import APIError
from storage3.utils import StorageException
from supabase import AsyncClient

from app.core.errors import AppError, ErrorCode
from app.schemas.history import ScanCursor


BUCKET_NAME = "scan-images"
SIGNED_URL_TTL_SECONDS = 3600


class ScanRepository:
    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def find_by_image_hash(
        self,
        user_id: UUID,
        image_hash: str,
        language: str,
    ) -> dict[str, Any] | None:
        try:
            response = (
                await self._client.table("scans")
                .select("*")
                .eq("user_id", str(user_id))
                .eq("image_hash", image_hash)
                .eq("language", language)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        return response.data[0] if response.data else None

    async def upload_image(
        self,
        user_id: UUID,
        scan_id: UUID,
        image_bytes: bytes,
    ) -> str:
        path = f"{user_id}/{scan_id}.jpg"
        try:
            await self._client.storage.from_(BUCKET_NAME).upload(
                path,
                image_bytes,
                {"content-type": "image/jpeg", "upsert": "false"},
            )
        except (StorageException, httpx.HTTPError) as exc:
            raise self._storage_error(exc) from exc
        return path

    async def insert_scan(self, record: dict[str, Any]) -> dict[str, Any]:
        try:
            response = (
                await self._client.table("scans")
                .insert(record)
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        if not response.data:
            raise AppError(
                ErrorCode.SUPABASE_UNAVAILABLE,
                "The scan could not be saved.",
                status_code=503,
            )
        return response.data[0]

    async def get_scan(self, user_id: UUID, scan_id: UUID) -> dict[str, Any] | None:
        try:
            response = (
                await self._client.table("scans")
                .select("*")
                .eq("user_id", str(user_id))
                .eq("id", str(scan_id))
                .limit(1)
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        return response.data[0] if response.data else None

    async def list_scans(
        self,
        user_id: UUID,
        *,
        limit: int,
        cursor: ScanCursor | None,
        query_text: str | None,
        status: str | None,
    ) -> list[dict[str, Any]]:
        query = self._client.table("scans").select("*").eq("user_id", str(user_id))
        if status is not None:
            query = query.eq("is_healthy", status == "healthy")
        if query_text:
            query = query.text_search(
                "search_vector",
                query_text,
                {"config": "simple", "type": "web_search"},
            )
        if cursor is not None:
            timestamp = cursor.created_at.isoformat()
            query = query.or_(
                f"created_at.lt.{timestamp},"
                f"and(created_at.eq.{timestamp},id.lt.{cursor.id})"
            )

        try:
            response = (
                await query.order("created_at", desc=True)
                .order("id", desc=True)
                .limit(limit)
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        return response.data

    async def create_signed_url(self, path: str) -> str:
        try:
            response = await self._client.storage.from_(BUCKET_NAME).create_signed_url(
                path,
                SIGNED_URL_TTL_SECONDS,
            )
        except (StorageException, httpx.HTTPError) as exc:
            raise self._storage_error(exc) from exc
        signed_url = response.get("signedURL") or response.get("signedUrl")
        if not signed_url:
            raise AppError(
                ErrorCode.SUPABASE_UNAVAILABLE,
                "A signed image URL could not be created.",
                status_code=503,
            )
        return signed_url

    async def create_signed_urls(self, paths: list[str]) -> dict[str, str]:
        if not paths:
            return {}
        try:
            responses = await self._client.storage.from_(BUCKET_NAME).create_signed_urls(
                paths,
                SIGNED_URL_TTL_SECONDS,
            )
        except (StorageException, httpx.HTTPError) as exc:
            raise self._storage_error(exc) from exc

        signed_urls: dict[str, str] = {}
        for item in responses:
            path = item.get("path")
            signed_url = item.get("signedURL") or item.get("signedUrl")
            if item.get("error") or not path or not signed_url:
                raise AppError(
                    ErrorCode.SUPABASE_UNAVAILABLE,
                    "One or more signed image URLs could not be created.",
                    status_code=503,
                )
            signed_urls[path] = signed_url
        if len(signed_urls) != len(set(paths)):
            raise AppError(
                ErrorCode.SUPABASE_UNAVAILABLE,
                "One or more signed image URLs are missing.",
                status_code=503,
            )
        return signed_urls

    async def delete_image(self, path: str) -> None:
        try:
            await self._client.storage.from_(BUCKET_NAME).remove([path])
        except (StorageException, httpx.HTTPError) as exc:
            raise self._storage_error(exc) from exc

    async def delete_scan_record(self, user_id: UUID, scan_id: UUID) -> None:
        try:
            await (
                self._client.table("scans")
                .delete()
                .eq("user_id", str(user_id))
                .eq("id", str(scan_id))
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc

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
