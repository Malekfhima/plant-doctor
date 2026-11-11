import base64
import binascii
import json
from typing import Any
from uuid import UUID

from pydantic import ValidationError

from app.core.errors import AppError, ErrorCode
from app.repositories.scans import ScanRepository
from app.schemas.history import HistoryPage, HistoryStatus, ScanCursor
from app.schemas.scans import AnalysisResponse


class HistoryService:
    def __init__(self, repository: ScanRepository) -> None:
        self._repository = repository

    async def list_history(
        self,
        user_id: UUID,
        *,
        limit: int,
        cursor: str | None,
        query_text: str | None,
        status: HistoryStatus | None,
    ) -> HistoryPage:
        decoded_cursor = self._decode_cursor(cursor) if cursor else None
        rows = await self._repository.list_scans(
            user_id,
            limit=limit + 1,
            cursor=decoded_cursor,
            query_text=query_text.strip() if query_text else None,
            status=status,
        )
        has_more = len(rows) > limit
        page_rows = rows[:limit]
        signed_urls = await self._repository.create_signed_urls(
            [row["image_path"] for row in page_rows]
        )
        items = [
            self._response_from_record(row, signed_urls[row["image_path"]])
            for row in page_rows
        ]
        next_cursor = (
            self._encode_cursor(page_rows[-1])
            if has_more and page_rows
            else None
        )
        return HistoryPage(items=items, next_cursor=next_cursor)

    async def get_scan(self, user_id: UUID, scan_id: UUID) -> AnalysisResponse:
        record = await self._repository.get_scan(user_id, scan_id)
        if record is None:
            raise AppError(
                ErrorCode.NOT_FOUND,
                "The requested scan was not found.",
                status_code=404,
            )
        image_url = await self._repository.create_signed_url(record["image_path"])
        return self._response_from_record(record, image_url)

    async def delete_scan(self, user_id: UUID, scan_id: UUID) -> None:
        record = await self._repository.get_scan(user_id, scan_id)
        if record is None:
            raise AppError(
                ErrorCode.NOT_FOUND,
                "The requested scan was not found.",
                status_code=404,
            )
        await self._repository.delete_image(record["image_path"])
        await self._repository.delete_scan_record(user_id, scan_id)

    @staticmethod
    def _response_from_record(
        record: dict[str, Any],
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

    @staticmethod
    def _encode_cursor(record: dict[str, Any]) -> str:
        cursor = ScanCursor.model_validate(
            {"created_at": record["created_at"], "id": record["id"]}
        )
        payload = json.dumps(
            {
                "created_at": cursor.created_at.isoformat(),
                "id": str(cursor.id),
            },
            separators=(",", ":"),
        ).encode("utf-8")
        return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")

    @staticmethod
    def _decode_cursor(value: str) -> ScanCursor:
        if len(value) > 512:
            raise AppError(
                ErrorCode.VALIDATION_ERROR,
                "The history cursor is invalid.",
                status_code=400,
            )
        try:
            padded = value + "=" * (-len(value) % 4)
            decoded = base64.b64decode(
                padded.encode("ascii"),
                altchars=b"-_",
                validate=True,
            )
            cursor_data = json.loads(decoded)
            return ScanCursor.model_validate(cursor_data)
        except (
            UnicodeEncodeError,
            UnicodeDecodeError,
            binascii.Error,
            json.JSONDecodeError,
            ValidationError,
            ValueError,
        ) as exc:
            raise AppError(
                ErrorCode.VALIDATION_ERROR,
                "The history cursor is invalid.",
                status_code=400,
            ) from exc
