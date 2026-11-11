from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Severity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ImageQuality(StrEnum):
    GOOD = "good"
    POOR = "poor"
    UNUSABLE = "unusable"


class Treatment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    organic: list[str]
    chemical: list[str]


class AnalysisResult(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    plant_name: str
    is_plant: bool
    is_healthy: bool
    disease_name: str | None
    confidence: Annotated[float, Field(ge=0, le=1)]
    severity: Severity | None
    symptoms: list[str]
    causes: list[str]
    treatment: Treatment
    prevention: list[str]
    image_quality: ImageQuality
    disclaimer: str

    @model_validator(mode="after")
    def healthy_result_has_no_disease(self) -> "AnalysisResult":
        if self.is_healthy and (
            self.disease_name is not None or self.severity is not None
        ):
            raise ValueError(
                "A healthy plant must not have a disease name or severity."
            )
        return self


Language = Literal["fr", "en", "ar"]
