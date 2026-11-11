from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response, status

from app.api.deps import get_current_user, get_plant_service
from app.core.rate_limit import limiter
from app.core.security import AuthenticatedUser
from app.schemas.plants import PlantCreate, PlantDetail, PlantPatch, PlantResponse
from app.schemas.scans import AnalysisResponse
from app.services.plants import PlantService


router = APIRouter()


@router.post("/plants", response_model=PlantResponse, summary="Create a plant")
@limiter.limit("60/minute")
async def create_plant(
    request: Request,
    response: Response,
    payload: PlantCreate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[PlantService, Depends(get_plant_service)],
) -> PlantResponse:
    return await service.create_plant(user.user_id, payload)


@router.get("/plants", response_model=list[PlantResponse], summary="List plants")
@limiter.limit("60/minute")
async def list_plants(
    request: Request,
    response: Response,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[PlantService, Depends(get_plant_service)],
) -> list[PlantResponse]:
    return await service.list_plants(user.user_id)


@router.get(
    "/plants/{plant_id}",
    response_model=PlantDetail,
    summary="Get a plant with its recent scans",
)
@limiter.limit("60/minute")
async def get_plant(
    request: Request,
    response: Response,
    plant_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[PlantService, Depends(get_plant_service)],
) -> PlantDetail:
    return await service.get_plant(user.user_id, plant_id)


@router.patch(
    "/plants/{plant_id}",
    response_model=PlantResponse,
    summary="Update a plant",
)
@limiter.limit("60/minute")
async def update_plant(
    request: Request,
    response: Response,
    plant_id: UUID,
    payload: PlantPatch,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[PlantService, Depends(get_plant_service)],
) -> PlantResponse:
    return await service.update_plant(user.user_id, plant_id, payload)


@router.delete(
    "/plants/{plant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete a plant",
)
@limiter.limit("60/minute")
async def delete_plant(
    request: Request,
    response: Response,
    plant_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[PlantService, Depends(get_plant_service)],
) -> Response:
    await service.delete_plant(user.user_id, plant_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/plants/{plant_id}/scans/{scan_id}",
    response_model=AnalysisResponse,
    summary="Link a scan to a plant",
)
@limiter.limit("60/minute")
async def link_scan_to_plant(
    request: Request,
    response: Response,
    plant_id: UUID,
    scan_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[PlantService, Depends(get_plant_service)],
) -> AnalysisResponse:
    return await service.link_scan(user.user_id, plant_id, scan_id)
