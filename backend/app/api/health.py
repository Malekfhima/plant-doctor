import httpx
from fastapi import APIRouter, Depends, Request, Response
from postgrest.exceptions import APIError

from app.core.config import Settings, get_settings
from app.core.errors import AppError, ErrorCode
from app.core.rate_limit import limiter


router = APIRouter()


@router.get("/health", summary="Check API liveness")
@limiter.limit("60/minute")
async def health(request: Request, response: Response) -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready", summary="Check API dependencies")
@limiter.limit("60/minute")
async def readiness(
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings),
) -> dict[str, object]:
    supabase = getattr(request.app.state, "supabase", None)
    if supabase is None:
        raise AppError(
            ErrorCode.SUPABASE_UNAVAILABLE,
            "Supabase is not configured.",
            status_code=503,
        )
    try:
        await supabase.table("profiles").select("id").limit(1).execute()
    except (APIError, httpx.HTTPError) as exc:
        raise AppError(
            ErrorCode.SUPABASE_UNAVAILABLE,
            "Supabase is not ready.",
            status_code=503,
        ) from exc

    provider = getattr(request.app.state, "vision_provider", None)
    provider_configured = (
        settings.llm_provider == "anthropic"
        and settings.anthropic_api_key is not None
        and provider is not None
    )
    if not provider_configured:
        raise AppError(
            ErrorCode.LLM_PROVIDER_UNAVAILABLE,
            "The configured vision provider is not ready.",
            status_code=503,
        )
    return {"status": "ready", "checks": {"supabase": "ok", "llm": "configured"}}
