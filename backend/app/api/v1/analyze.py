from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Request, Response, UploadFile

from app.api.deps import get_analysis_service, get_current_user
from app.core.config import Settings, get_settings
from app.core.rate_limit import limiter
from app.core.security import AuthenticatedUser
from app.schemas.analysis import Language
from app.schemas.scans import AnalysisResponse
from app.services.analysis import AnalysisService


router = APIRouter()


@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    summary="Analyze a plant image",
    description=(
        "Upload a plant photo for visual diagnosis. The returned analysis is "
        "saved to the authenticated user's history by default."
    ),
)
@limiter.limit("10/minute")
@limiter.limit("50/day")
async def analyze_image(
    request: Request,
    response: Response,
    image: Annotated[UploadFile, File(description="JPEG, PNG, WebP, or HEIC image.")],
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[AnalysisService, Depends(get_analysis_service)],
    settings: Annotated[Settings, Depends(get_settings)],
    language: Annotated[Language, Form()] = "fr",
    plant_hint: Annotated[str | None, Form(max_length=200)] = None,
    save: Annotated[bool, Form()] = True,
) -> AnalysisResponse:
    image_bytes = await image.read(settings.max_image_mb * 1024 * 1024 + 1)
    return await service.analyze(
        user.user_id,
        image_bytes,
        language,
        plant_hint,
        save,
    )
