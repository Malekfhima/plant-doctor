from typing import Any
from uuid import UUID

import httpx
import structlog
from postgrest.exceptions import APIError
from supabase import AsyncClient

from app.core.errors import AppError, ErrorCode


class PlantRepository:
    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def create_plant(self, user_id: UUID, values: dict[str, Any]) -> dict[str, Any]:
        record = {"user_id": str(user_id), **values}
        try:
            response = await self._client.table("plants").insert(record).execute()
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        if not response.data:
            raise self._database_error(
                RuntimeError("Supabase returned no row for the inserted plant.")
            )
        return response.data[0]

    async def list_plants(self, user_id: UUID) -> list[dict[str, Any]]:
        try:
            response = (
                await self._client.table("plants")
                .select("*")
                .eq("user_id", str(user_id))
                .order("created_at", desc=True)
                .order("id", desc=True)
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        return response.data

    async def get_plant(self, user_id: UUID, plant_id: UUID) -> dict[str, Any] | None:
        try:
            response = (
                await self._client.table("plants")
                .select("*")
                .eq("user_id", str(user_id))
                .eq("id", str(plant_id))
                .limit(1)
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        return response.data[0] if response.data else None

    async def update_plant(
        self,
        user_id: UUID,
        plant_id: UUID,
        values: dict[str, Any],
    ) -> dict[str, Any] | None:
        try:
            response = (
                await self._client.table("plants")
                .update(values)
                .eq("user_id", str(user_id))
                .eq("id", str(plant_id))
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        return response.data[0] if response.data else None

    async def delete_plant(self, user_id: UUID, plant_id: UUID) -> bool:
        try:
            response = (
                await self._client.table("plants")
                .delete()
                .eq("user_id", str(user_id))
                .eq("id", str(plant_id))
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        return bool(response.data)

    async def link_scan(
        self,
        user_id: UUID,
        plant_id: UUID,
        scan_id: UUID,
    ) -> dict[str, Any] | None:
        try:
            response = (
                await self._client.table("scans")
                .update({"plant_id": str(plant_id)})
                .eq("user_id", str(user_id))
                .eq("id", str(scan_id))
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        return response.data[0] if response.data else None

    async def list_plant_scans(
        self,
        user_id: UUID,
        plant_id: UUID,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        try:
            response = (
                await self._client.table("scans")
                .select("*")
                .eq("user_id", str(user_id))
                .eq("plant_id", str(plant_id))
                .order("created_at", desc=True)
                .order("id", desc=True)
                .limit(limit)
                .execute()
            )
        except (APIError, httpx.HTTPError) as exc:
            raise self._database_error(exc) from exc
        return response.data

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
