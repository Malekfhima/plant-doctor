from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from app.api.deps import get_current_user, get_user_service
from app.core.rate_limit import limiter
from app.core.security import AuthenticatedUser
from app.schemas.plants import ProfilePatch, ProfileResponse
from app.services.users import UserService


router = APIRouter()


@router.get("/me", response_model=ProfileResponse, summary="Get my profile")
@limiter.limit("60/minute")
async def get_my_profile(
    request: Request,
    response: Response,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> ProfileResponse:
    return await service.get_profile(user.user_id)


@router.patch("/me", response_model=ProfileResponse, summary="Update my profile")
@limiter.limit("60/minute")
async def update_my_profile(
    request: Request,
    response: Response,
    payload: ProfilePatch,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> ProfileResponse:
    return await service.update_profile(user.user_id, payload)


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete my account and data",
)
@limiter.limit("60/minute")
async def delete_my_account(
    request: Request,
    response: Response,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> Response:
    await service.delete_account(user.user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
