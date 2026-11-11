from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
from pydantic import SecretStr

from app.api.deps import (
    get_analysis_service,
    get_current_user,
    get_history_service,
    get_user_service,
)
from app.core.config import Settings, get_settings
from app.core.errors import ErrorCode
from app.main import app
from app.schemas.analysis import AnalysisResult
from app.schemas.history import HistoryPage
from app.schemas.plants import ProfilePatch, ProfileResponse
from app.schemas.scans import AnalysisResponse


def analysis_response() -> AnalysisResponse:
    result = AnalysisResult(
        plant_name="Basil",
        is_plant=True,
        is_healthy=True,
        disease_name=None,
        confidence=0.91,
        severity=None,
        symptoms=[],
        causes=[],
        treatment={"organic": [], "chemical": []},
        prevention=[],
        image_quality="good",
        disclaimer="Informational only.",
    )
    return AnalysisResponse(
        **result.model_dump(),
        scan_id=uuid4(),
        image_url="https://storage.example/basil.jpg",
        created_at=datetime.now(timezone.utc),
    )


class AnalysisStub:
    def __init__(self) -> None:
        self.calls: list[tuple[object, bytes, str, str | None, bool]] = []

    async def analyze(
        self,
        user_id: object,
        image_bytes: bytes,
        language: str,
        plant_hint: str | None,
        save: bool,
    ) -> AnalysisResponse:
        self.calls.append((user_id, image_bytes, language, plant_hint, save))
        return analysis_response()


class HistoryStub:
    def __init__(self) -> None:
        self.arguments: dict[str, object] | None = None

    async def list_history(self, user_id: object, **kwargs: object) -> HistoryPage:
        self.arguments = {"user_id": user_id, **kwargs}
        return HistoryPage(items=[], next_cursor=None)


class UserStub:
    def __init__(self, user_id: object) -> None:
        now = datetime.now(timezone.utc)
        self.profile = ProfileResponse(
            id=user_id,
            language="fr",
            theme="system",
            notifications=True,
            created_at=now,
            updated_at=now,
        )

    async def get_profile(self, _user_id: object) -> ProfileResponse:
        return self.profile

    async def update_profile(
        self,
        _user_id: object,
        payload: ProfilePatch,
    ) -> ProfileResponse:
        self.profile = self.profile.model_copy(
            update=payload.model_dump(exclude_unset=True)
        )
        return self.profile


class ReadySupabase:
    def table(self, _table: str) -> "ReadySupabase":
        return self

    def select(self, _columns: str) -> "ReadySupabase":
        return self

    def limit(self, _count: int) -> "ReadySupabase":
        return self

    async def execute(self) -> SimpleNamespace:
        return SimpleNamespace(data=[])


def test_analyze_endpoint_accepts_multipart_and_returns_request_id(
    api_client: tuple[object, object],
    png_image: bytes,
) -> None:
    client, user_id = api_client
    service = AnalysisStub()
    app.dependency_overrides[get_analysis_service] = lambda: service

    response = client.post(
        "/api/v1/analyze",
        files={"image": ("leaf.png", png_image, "image/png")},
        data={"language": "en", "plant_hint": "basil", "save": "false"},
        headers={"X-Request-ID": "652e1798-01aa-47ac-9160-e39df327a021"},
    )

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "652e1798-01aa-47ac-9160-e39df327a021"
    assert response.json()["plant_name"] == "Basil"
    assert service.calls == [(user_id, png_image, "en", "basil", False)]


@pytest.mark.parametrize("language", ["fr", "en", "ar"])
def test_analyze_endpoint_accepts_supported_languages(
    api_client: tuple[object, object],
    png_image: bytes,
    language: str,
) -> None:
    client, user_id = api_client
    service = AnalysisStub()
    app.dependency_overrides[get_analysis_service] = lambda: service

    response = client.post(
        "/api/v1/analyze",
        files={"image": ("leaf.png", png_image, "image/png")},
        data={"language": language, "save": "false"},
    )

    assert response.status_code == 200
    assert service.calls == [(user_id, png_image, language, None, False)]


def test_profile_language_accepts_supported_values_and_rejects_others(
    api_client: tuple[object, object],
) -> None:
    client, user_id = api_client
    service = UserStub(user_id)
    app.dependency_overrides[get_user_service] = lambda: service

    initial = client.get("/api/v1/me")
    assert initial.status_code == 200
    assert initial.json()["language"] == "fr"

    for language in ("fr", "en", "ar"):
        response = client.patch("/api/v1/me", json={"language": language})
        assert response.status_code == 200
        assert response.json()["language"] == language

    invalid = client.patch("/api/v1/me", json={"language": "de"})
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == ErrorCode.VALIDATION_ERROR.value


def test_analysis_endpoint_enforces_rate_limit_per_authenticated_user(
    api_client: tuple[object, object],
    png_image: bytes,
) -> None:
    client, _user_id = api_client
    app.dependency_overrides[get_analysis_service] = lambda: AnalysisStub()

    responses = [
        client.post(
            "/api/v1/analyze",
            files={"image": ("leaf.png", png_image, "image/png")},
            data={"save": "false"},
        )
        for _ in range(11)
    ]

    assert all(response.status_code == 200 for response in responses[:10])
    assert responses[10].status_code == 429
    assert responses[10].json()["error"]["code"] == ErrorCode.RATE_LIMITED.value


def test_history_endpoint_forwards_filters_and_cursor(api_client: tuple[object, object]) -> None:
    client, user_id = api_client
    service = HistoryStub()
    app.dependency_overrides[get_history_service] = lambda: service

    response = client.get(
        "/api/v1/history",
        params={
            "limit": 7,
            "cursor": "opaque-cursor",
            "q": " tomato ",
            "status": "diseased",
        },
    )

    assert response.status_code == 200
    assert service.arguments == {
        "user_id": user_id,
        "limit": 7,
        "cursor": "opaque-cursor",
        "query_text": " tomato ",
        "status": "diseased",
    }


def test_request_validation_and_authentication_errors_are_normalized(
    api_client: tuple[object, object],
) -> None:
    client, _user_id = api_client
    app.dependency_overrides[get_history_service] = lambda: HistoryStub()

    invalid_query = client.get("/api/v1/history", params={"limit": 101})
    assert invalid_query.status_code == 422
    assert invalid_query.json()["error"]["code"] == ErrorCode.VALIDATION_ERROR.value

    app.dependency_overrides.pop(get_current_user)
    unauthenticated = client.get("/api/v1/me")
    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["error"]["code"] == ErrorCode.UNAUTHORIZED.value


def test_health_and_readiness_report_dependency_state(
    api_client: tuple[object, object],
) -> None:
    client, _user_id = api_client

    assert client.get("/health").json() == {"status": "ok"}
    not_ready = client.get("/health/ready")
    assert not_ready.status_code == 503
    assert (
        not_ready.json()["error"]["code"]
        == ErrorCode.SUPABASE_UNAVAILABLE.value
    )

    client.app.state.supabase = ReadySupabase()
    client.app.state.vision_provider = object()
    app.dependency_overrides[get_settings] = lambda: Settings(
        llm_provider="anthropic",
        anthropic_api_key=SecretStr("configured-key"),
    )
    ready = client.get("/health/ready")

    assert ready.status_code == 200
    assert ready.json() == {
        "status": "ready",
        "checks": {"supabase": "ok", "llm": "configured"},
    }


def test_readiness_reports_supabase_connection_failure(
    api_client: tuple[object, object],
) -> None:
    client, _user_id = api_client

    class BrokenSupabase(ReadySupabase):
        async def execute(self) -> None:
            raise httpx.ConnectError("Supabase is unreachable.")

    client.app.state.supabase = BrokenSupabase()
    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == ErrorCode.SUPABASE_UNAVAILABLE.value


def test_readiness_reports_unconfigured_provider(
    api_client: tuple[object, object],
) -> None:
    client, _user_id = api_client
    client.app.state.supabase = ReadySupabase()

    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["error"]["code"] == ErrorCode.LLM_PROVIDER_UNAVAILABLE.value


def test_openapi_contains_documented_routes_and_examples(
    api_client: tuple[object, object],
) -> None:
    client, _user_id = api_client
    response = client.get("/openapi.json")
    schema = response.json()

    assert response.status_code == 200
    assert "/api/v1/analyze" in schema["paths"]
    assert "/health/ready" in schema["paths"]
    assert schema["components"]["schemas"]["AnalysisResponse"]["example"]["plant_name"] == "Tomate"
