from typing import Any
from uuid import UUID

import structlog

from app.core.errors import AppError, ErrorCode
from app.repositories.plants import PlantRepository
from app.repositories.scans import ScanRepository
from app.schemas.plants import PlantCreate, PlantDetail, PlantPatch, PlantResponse
from app.schemas.scans import AnalysisResponse


class PlantService:
    def __init__(
        self,
        plants: PlantRepository,
        scans: ScanRepository,
    ) -> None:
        self._plants = plants
        self._scans = scans

    async def create_plant(self, user_id: UUID, payload: PlantCreate) -> PlantResponse:
        values = payload.model_dump(exclude={"scan_id"})
        plant = await self._plants.create_plant(user_id, values)
        if payload.scan_id is not None:
            try:
                linked_scan = await self._plants.link_scan(
                    user_id,
                    UUID(str(plant["id"])),
                    payload.scan_id,
                )
            except AppError:
                await self._cleanup_plant(user_id, UUID(str(plant["id"])))
                raise
            if linked_scan is None:
                await self._cleanup_plant(user_id, UUID(str(plant["id"])))
                raise AppError(
                    ErrorCode.NOT_FOUND,
                    "The requested scan was not found.",
                    status_code=404,
                )
        return PlantResponse.model_validate(plant)

    async def list_plants(self, user_id: UUID) -> list[PlantResponse]:
        rows = await self._plants.list_plants(user_id)
        return [PlantResponse.model_validate(row) for row in rows]

    async def get_plant(self, user_id: UUID, plant_id: UUID) -> PlantDetail:
        plant = await self._plants.get_plant(user_id, plant_id)
        if plant is None:
            raise self._plant_not_found()
        scans = await self._plants.list_plant_scans(user_id, plant_id)
        signed_urls = await self._scans.create_signed_urls(
            [scan["image_path"] for scan in scans]
        )
        return PlantDetail(
            **PlantResponse.model_validate(plant).model_dump(),
            scans=[
                self._scan_response(scan, signed_urls[scan["image_path"]])
                for scan in scans
            ],
        )

    async def update_plant(
        self,
        user_id: UUID,
        plant_id: UUID,
        payload: PlantPatch,
    ) -> PlantResponse:
        plant = await self._plants.update_plant(
            user_id,
            plant_id,
            payload.model_dump(exclude_unset=True),
        )
        if plant is None:
            raise self._plant_not_found()
        return PlantResponse.model_validate(plant)

    async def delete_plant(self, user_id: UUID, plant_id: UUID) -> None:
        if not await self._plants.delete_plant(user_id, plant_id):
            raise self._plant_not_found()

    async def link_scan(
        self,
        user_id: UUID,
        plant_id: UUID,
        scan_id: UUID,
    ) -> AnalysisResponse:
        if await self._plants.get_plant(user_id, plant_id) is None:
            raise self._plant_not_found()
        scan = await self._plants.link_scan(user_id, plant_id, scan_id)
        if scan is None:
            raise AppError(
                ErrorCode.NOT_FOUND,
                "The requested scan was not found.",
                status_code=404,
            )
        image_url = await self._scans.create_signed_url(scan["image_path"])
        return self._scan_response(scan, image_url)

    async def _cleanup_plant(self, user_id: UUID, plant_id: UUID) -> None:
        try:
            if not await self._plants.delete_plant(user_id, plant_id):
                structlog.get_logger(__name__).error(
                    "failed_to_cleanup_plant",
                    user_id=str(user_id),
                    plant_id=str(plant_id),
                    reason="plant_not_deleted",
                )
        except AppError:
            structlog.get_logger(__name__).exception(
                "failed_to_cleanup_plant",
                user_id=str(user_id),
                plant_id=str(plant_id),
            )

    @staticmethod
    def _scan_response(record: dict[str, Any], image_url: str) -> AnalysisResponse:
        result = record.get("result")
        if not isinstance(result, dict):
            raise AppError(
                ErrorCode.SUPABASE_UNAVAILABLE,
                "The saved analysis has an invalid format.",
                status_code=503,
            )
        return AnalysisResponse.model_validate(
            {
                **result,
                "scan_id": record.get("id"),
                "image_url": image_url,
                "created_at": record.get("created_at"),
            }
        )

    @staticmethod
    def _plant_not_found() -> AppError:
        return AppError(
            ErrorCode.NOT_FOUND,
            "The requested plant was not found.",
            status_code=404,
        )
