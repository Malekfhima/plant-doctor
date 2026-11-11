from datetime import datetime, timezone
from time import perf_counter
from uuid import UUID, uuid4

import structlog

from app.ai.base import VisionProvider
from app.core.errors import AppError, ErrorCode
from app.repositories.quotas import QuotaRepository
from app.repositories.scans import ScanRepository
from app.schemas.analysis import AnalysisResult, Language
from app.schemas.scans import AnalysisResponse
from app.utils.image import process_image


class AnalysisService:
    def __init__(
        self,
        provider: VisionProvider,
        repository: ScanRepository,
        quota_repository: QuotaRepository,
        max_image_mb: int,
        daily_scan_quota: int,
    ) -> None:
        self._provider = provider
        self._repository = repository
        self._quota_repository = quota_repository
        self._max_image_mb = max_image_mb
        self._daily_scan_quota = daily_scan_quota

    async def analyze(
        self,
        user_id: UUID,
        image_bytes: bytes,
        language: Language,
        plant_hint: str | None,
        save: bool,
    ) -> AnalysisResponse:
        image = process_image(image_bytes, max_image_mb=self._max_image_mb)

        if save:
            duplicate = await self._repository.find_by_image_hash(
                user_id,
                image.image_hash,
                language,
            )
            if duplicate is not None:
                image_url = await self._repository.create_signed_url(
                    duplicate["image_path"]
                )
                return self._response_from_record(duplicate, image_url)

        await self._quota_repository.reserve_daily_scan_quota(
            user_id,
            self._daily_scan_quota,
        )

        llm_started_at = perf_counter()
        llm_status = "error"
        try:
            result = await self._provider.analyze(
                image.data,
                image.media_type,
                language,
                plant_hint,
            )
            llm_status = "success"
        finally:
            structlog.get_logger(__name__).info(
                "llm_analysis_complete",
                user_id=str(user_id),
                status=llm_status,
                duration_ms=round((perf_counter() - llm_started_at) * 1000, 2),
            )
        if not save:
            return AnalysisResponse(
                **result.model_dump(),
                scan_id=None,
                image_url=None,
                created_at=datetime.now(timezone.utc),
            )

        scan_id = uuid4()
        image_path = await self._repository.upload_image(
            user_id,
            scan_id,
            image.data,
        )
        record = self._scan_record(
            user_id=user_id,
            scan_id=scan_id,
            image_path=image_path,
            image_hash=image.image_hash,
            language=language,
            result=result,
        )

        try:
            saved_record = await self._repository.insert_scan(record)
        except AppError:
            await self._cleanup_image(image_path, user_id, scan_id)
            raise

        try:
            image_url = await self._repository.create_signed_url(image_path)
        except AppError:
            await self._cleanup_saved_scan(image_path, user_id, scan_id)
            raise
        return self._response_from_record(saved_record, image_url)

    @staticmethod
    def _scan_record(
        *,
        user_id: UUID,
        scan_id: UUID,
        image_path: str,
        image_hash: str,
        language: Language,
        result: AnalysisResult,
    ) -> dict[str, object]:
        return {
            "id": str(scan_id),
            "user_id": str(user_id),
            "plant_id": None,
            "image_path": image_path,
            "image_hash": image_hash,
            "plant_name": result.plant_name,
            "is_healthy": result.is_healthy,
            "disease_name": result.disease_name,
            "confidence": result.confidence,
            "severity": result.severity.value if result.severity else None,
            "result": result.model_dump(mode="json"),
            "language": language,
        }

    @staticmethod
    def _response_from_record(
        record: dict[str, object],
        image_url: str,
    ) -> AnalysisResponse:
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

    async def _cleanup_image(
        self,
        image_path: str,
        user_id: UUID,
        scan_id: UUID,
    ) -> None:
        try:
            await self._repository.delete_image(image_path)
        except AppError:
            structlog.get_logger(__name__).exception(
                "failed_to_cleanup_scan_image",
                user_id=str(user_id),
                scan_id=str(scan_id),
            )

    async def _cleanup_saved_scan(
        self,
        image_path: str,
        user_id: UUID,
        scan_id: UUID,
    ) -> None:
        try:
            await self._repository.delete_scan_record(user_id, scan_id)
        except AppError:
            structlog.get_logger(__name__).exception(
                "failed_to_cleanup_scan_record",
                user_id=str(user_id),
                scan_id=str(scan_id),
            )
        await self._cleanup_image(image_path, user_id, scan_id)
