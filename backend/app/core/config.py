from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    env: Literal["development", "test", "production"] = "development"
    supabase_url: str | None = None
    supabase_service_key: SecretStr | None = None
    supabase_jwt_secret: SecretStr | None = None
    llm_provider: Literal["anthropic", "gemini"] = "anthropic"
    anthropic_api_key: SecretStr | None = None
    gemini_api_key: SecretStr | None = None
    llm_model: str = "claude-sonnet-4-5"
    llm_timeout: float = Field(default=30, gt=0, le=300)
    allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )
    max_image_mb: int = Field(default=8, gt=0, le=64)
    daily_scan_quota: int = Field(default=50, gt=0)
    rate_limit_storage_uri: str = "memory://"

    @field_validator(
        "supabase_service_key",
        "supabase_jwt_secret",
        "anthropic_api_key",
        "gemini_api_key",
        mode="before",
    )
    @classmethod
    def ignore_unconfigured_secret(
        cls, value: str | SecretStr | None
    ) -> str | SecretStr | None:
        if value is None:
            return None
        secret = value.get_secret_value() if isinstance(value, SecretStr) else value
        if not secret.strip() or secret.strip().lower().startswith("replace-with-"):
            return None
        return value

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_allowed_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("allowed_origins")
    @classmethod
    def validate_allowed_origins(cls, origins: list[str]) -> list[str]:
        for origin in origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.path
                or parsed.query
                or parsed.fragment
                or parsed.username
                or parsed.password
                or "*" in origin
            ):
                raise ValueError(f"Invalid CORS origin: {origin!r}")
        return origins

    @field_validator("llm_model")
    @classmethod
    def validate_llm_model(cls, model: str) -> str:
        normalized = model.strip()
        if not normalized:
            raise ValueError("LLM_MODEL must not be empty")
        return normalized


@lru_cache
def get_settings() -> Settings:
    return Settings()
