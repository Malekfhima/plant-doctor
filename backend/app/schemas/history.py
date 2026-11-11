from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.schemas.scans import AnalysisResponse


class ScanCursor(BaseModel):
    created_at: datetime
    id: UUID

    @field_validator("created_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Cursor timestamp must include a timezone.")
        return value.astimezone(timezone.utc)


class HistoryPage(BaseModel):
    model_config = {
        "json_schema_extra": {
            "example": {
                "items": [],
                "next_cursor": "eyJjcmVhdGVkX2F0IjoiLi4uIiwiaWQiOiIuLi4ifQ",
            }
        }
    }

    items: list[AnalysisResponse]
    next_cursor: str | None


HistoryStatus = Literal["healthy", "diseased"]
