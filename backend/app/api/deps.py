from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import AsyncClient

from app.ai.base import VisionProvider
from app.core.config import Settings, get_settings
from app.core.errors import AppError, ErrorCode
from app.core.security import AuthenticatedUser, decode_access_token
from app.repositories.plants import PlantRepository
from app.repositories.quotas import QuotaRepository
from app.repositories.scans import ScanRepository
from app.repositories.users import UserRepository
from app.services.analysis import AnalysisService
from app.services.history import HistoryService
from app.services.plants import PlantService
from app.services.users import UserService


bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(
            ErrorCode.UNAUTHORIZED,
            "A bearer access token is required.",
            status_code=401,
        )

    if settings.supabase_url is None and settings.supabase_jwt_secret is None:
        raise AppError(
            ErrorCode.AUTHENTICATION_NOT_CONFIGURED,
            "Authentication is not configured.",
            status_code=503,
        )

    user = await decode_access_token(
        credentials.credentials,
        settings.supabase_url,
        (
            settings.supabase_jwt_secret.get_secret_value()
            if settings.supabase_jwt_secret is not None
            else None
        ),
    )
    request.state.user_id = str(user.user_id)
    return user


def get_supabase_client(request: Request) -> AsyncClient:
    client = getattr(request.app.state, "supabase", None)
    if client is None:
        raise AppError(
            ErrorCode.SUPABASE_UNAVAILABLE,
            "Supabase is not configured.",
            status_code=503,
        )
    return client


def get_vision_provider(request: Request) -> VisionProvider:
    provider = getattr(request.app.state, "vision_provider", None)
    if provider is None:
        raise AppError(
            ErrorCode.LLM_PROVIDER_UNAVAILABLE,
            "The vision provider is not configured.",
            status_code=503,
        )
    return provider


def get_analysis_service(
    client: Annotated[AsyncClient, Depends(get_supabase_client)],
    provider: Annotated[VisionProvider, Depends(get_vision_provider)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AnalysisService:
    return AnalysisService(
        provider,
        ScanRepository(client),
        QuotaRepository(client),
        max_image_mb=settings.max_image_mb,
        daily_scan_quota=settings.daily_scan_quota,
    )


def get_history_service(
    client: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> HistoryService:
    return HistoryService(ScanRepository(client))


def get_plant_repository(
    client: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> PlantRepository:
    return PlantRepository(client)


def get_user_repository(
    client: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> UserRepository:
    return UserRepository(client)


def get_plant_service(
    plant_repository: Annotated[PlantRepository, Depends(get_plant_repository)],
    client: Annotated[AsyncClient, Depends(get_supabase_client)],
) -> PlantService:
    return PlantService(plant_repository, ScanRepository(client))


def get_user_service(
    repository: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserService:
    return UserService(repository)
