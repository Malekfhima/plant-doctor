from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.scans import AnalysisResponse


class PlantCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    species: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    scan_id: UUID | None = None


class PlantPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=120)
    species: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def require_update_fields(self) -> "PlantPatch":
        if not self.model_fields_set:
            raise ValueError("At least one plant field must be provided.")
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("Plant name cannot be null.")
        return self


class PlantResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "f3b4c320-69a7-4e51-8ea3-083c709df0c6",
                "name": "Mon basilic",
                "species": "Ocimum basilicum",
                "notes": "Sur le rebord de la fenêtre",
                "created_at": "2026-01-15T12:00:00Z",
                "updated_at": "2026-01-15T12:00:00Z",
            }
        }
    )

    id: UUID
    name: str
    species: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class PlantDetail(PlantResponse):
    scans: list[AnalysisResponse]


class ProfileResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "f3b4c320-69a7-4e51-8ea3-083c709df0c6",
                "language": "fr",
                "theme": "system",
                "notifications": True,
                "created_at": "2026-01-15T12:00:00Z",
                "updated_at": "2026-01-15T12:00:00Z",
            }
        }
    )

    id: UUID
    language: Literal["fr", "en", "ar"]
    theme: Literal["light", "dark", "system"]
    notifications: bool
    created_at: datetime
    updated_at: datetime


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    language: Literal["fr", "en", "ar"] | None = None
    theme: Literal["light", "dark", "system"] | None = None
    notifications: bool | None = None

    @field_validator("language", "theme", "notifications")
    @classmethod
    def reject_null_updates(cls, value: str | bool | None) -> str | bool:
        if value is None:
            raise ValueError("Profile preferences cannot be null.")
        return value

    @model_validator(mode="after")
    def require_update_fields(self) -> "ProfilePatch":
        if not self.model_fields_set:
            raise ValueError("At least one profile preference must be provided.")
        return self
