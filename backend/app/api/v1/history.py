from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status

from app.api.deps import get_current_user, get_history_service
from app.core.rate_limit import limiter
from app.core.security import AuthenticatedUser
from app.schemas.history import HistoryPage, HistoryStatus
from app.schemas.scans import AnalysisResponse
from app.services.history import HistoryService


router = APIRouter()


@router.get(
    "/history",
    response_model=HistoryPage,
    summary="List saved scans",
    description=(
        "List the authenticated user's scans in reverse chronological order. "
        "Use the opaque next_cursor value to fetch the next page."
    ),
)
@limiter.limit("60/minute")
async def list_history(
    request: Request,
    response: Response,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[HistoryService, Depends(get_history_service)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    cursor: Annotated[str | None, Query(max_length=512)] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    status_filter: Annotated[
        HistoryStatus | None,
        Query(alias="status"),
    ] = None,
) -> HistoryPage:
    return await service.list_history(
        user.user_id,
        limit=limit,
        cursor=cursor,
        query_text=q,
        status=status_filter,
    )


@router.get(
    "/history/{scan_id}",
    response_model=AnalysisResponse,
    summary="Get a saved scan",
)
@limiter.limit("60/minute")
async def get_history_item(
    request: Request,
    response: Response,
    scan_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[HistoryService, Depends(get_history_service)],
) -> AnalysisResponse:
    return await service.get_scan(user.user_id, scan_id)


@router.delete(
    "/history/{scan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete a saved scan",
)
@limiter.limit("60/minute")
async def delete_history_item(
    request: Request,
    response: Response,
    scan_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    service: Annotated[HistoryService, Depends(get_history_service)],
) -> Response:
    await service.delete_scan(user.user_id, scan_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
