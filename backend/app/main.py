from contextlib import AsyncExitStack, asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import AsyncClient, create_async_client

from app.ai.anthropic_provider import AnthropicVisionProvider
from app.ai.base import VisionProvider
from app.ai.gemini_provider import GeminiVisionProvider
from app.api import health
from app.api.v1 import analyze, history
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.core.rate_limit import limiter
from app.api.v1 import plants, users


async def close_supabase_client(client: AsyncClient) -> None:
    async with AsyncExitStack() as stack:
        stack.push_async_callback(client.auth.close)
        stack.push_async_callback(client.postgrest.aclose)
        stack.push_async_callback(client.storage.session.aclose)
        stack.push_async_callback(client.functions._client.aclose)
        stack.push_async_callback(client.realtime.close)


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    async with AsyncExitStack() as stack:
        supabase_client: AsyncClient | None = None
        if settings.supabase_url and settings.supabase_service_key:
            supabase_client = await create_async_client(
                settings.supabase_url,
                settings.supabase_service_key.get_secret_value(),
            )
            stack.push_async_callback(close_supabase_client, supabase_client)

        provider: VisionProvider | None
        if settings.llm_provider == "anthropic":
            provider = None
            if settings.anthropic_api_key is not None:
                provider = AnthropicVisionProvider(
                    settings.anthropic_api_key.get_secret_value(),
                    settings.llm_model,
                    settings.llm_timeout,
                )
        else:
            provider = GeminiVisionProvider()
        if provider is not None:
            stack.push_async_callback(provider.aclose)

        application.state.supabase = supabase_client
        application.state.vision_provider = provider
        yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.env)

    application = FastAPI(
        title="PlantDoctor API",
        description="Plant health analysis and care API.",
        version="1.0.0",
        lifespan=lifespan,
    )
    register_exception_handlers(application)
    application.state.limiter = limiter
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    application.add_middleware(RequestContextMiddleware)
    application.include_router(analyze.router, prefix="/api/v1")
    application.include_router(history.router, prefix="/api/v1")
    application.include_router(plants.router, prefix="/api/v1")
    application.include_router(users.router, prefix="/api/v1")
    application.include_router(health.router)
    return application


app = create_app()
