from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict

from app.schemas.analysis import AnalysisResult


class AnalysisResponse(AnalysisResult):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scan_id": "f3b4c320-69a7-4e51-8ea3-083c709df0c6",
                "image_url": "https://project.supabase.co/storage/v1/object/sign/scan-images/user/scan.jpg?token=example",
                "plant_name": "Tomate",
                "is_plant": True,
                "is_healthy": False,
                "disease_name": "Mildiou",
                "confidence": 0.87,
                "severity": "medium",
                "symptoms": ["Taches brunes sur les feuilles"],
                "causes": ["Conditions humides"],
                "treatment": {
                    "organic": ["Retirer les feuilles atteintes"],
                    "chemical": [],
                },
                "prevention": ["Éviter l'arrosage du feuillage"],
                "image_quality": "good",
                "disclaimer": "Cette analyse est indicative.",
                "created_at": "2026-01-15T12:00:00Z",
            }
        }
    )

    scan_id: UUID | None
    image_url: str | None
    created_at: datetime
