import asyncio
import json
from types import SimpleNamespace
from uuid import uuid4

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from pydantic import SecretStr, ValidationError

from app.ai.anthropic_provider import (
    AnthropicVisionProvider,
    InvalidModelResponse,
    parse_analysis_response,
)
from app.core.config import Settings
from app.core.errors import AppError, ErrorCode
import app.core.security as security
from app.core.security import decode_access_token
from app.schemas.analysis import AnalysisResult


def valid_model_json(**overrides: object) -> str:
    payload: dict[str, object] = {
        "plant_name": "Basil",
        "is_plant": True,
        "is_healthy": True,
        "disease_name": None,
        "confidence": 0.9,
        "severity": None,
        "symptoms": [],
        "causes": [],
        "treatment": {"organic": [], "chemical": []},
        "prevention": [],
        "image_quality": "good",
        "disclaimer": "Informational.",
    }
    payload.update(overrides)
    return json.dumps(payload)


class MessagesStub:
    def __init__(self, responses: list[object]) -> None:
        self.responses = responses
        self.calls: list[dict[str, object]] = []

    async def create(self, **kwargs: object) -> object:
        self.calls.append(kwargs)
        next_response = self.responses.pop(0)
        if isinstance(next_response, Exception):
            raise next_response
        if asyncio.iscoroutine(next_response):
            return await next_response
        return next_response


class AnthropicClientStub:
    def __init__(self, responses: list[object]) -> None:
        self.messages = MessagesStub(responses)
        self.closed = False

    async def close(self) -> None:
        self.closed = True


def model_response(text: str) -> SimpleNamespace:
    return SimpleNamespace(content=[SimpleNamespace(type="text", text=text)])


def test_settings_ignore_placeholder_secrets_and_parse_cors_list() -> None:
    settings = Settings(
        supabase_service_key="replace-with-a-secret",
        anthropic_api_key="",
        allowed_origins="https://plant.example, http://localhost:5173",
    )

    assert settings.supabase_service_key is None
    assert settings.anthropic_api_key is None
    assert settings.allowed_origins == [
        "https://plant.example",
        "http://localhost:5173",
    ]


@pytest.mark.parametrize("origin", ["*", "https://example.com/path", "ftp://example.com"])
def test_settings_reject_invalid_cors_origins(origin: str) -> None:
    with pytest.raises(ValidationError):
        Settings(allowed_origins=[origin])


@pytest.mark.asyncio
async def test_hs256_fallback_requires_valid_signature_subject_and_role() -> None:
    secret = "local-test-secret-that-is-at-least-32-bytes"
    user_id = uuid4()
    token = jwt.encode(
        {
            "sub": str(user_id),
            "aud": "authenticated",
            "role": "authenticated",
            "exp": 4_102_444_800,
        },
        secret,
        algorithm="HS256",
    )

    assert (await decode_access_token(token, None, secret)).user_id == user_id

    wrong_role = jwt.encode(
        {
            "sub": str(user_id),
            "aud": "authenticated",
            "role": "anon",
            "exp": 4_102_444_800,
        },
        secret,
        algorithm="HS256",
    )
    with pytest.raises(AppError) as error:
        await decode_access_token(wrong_role, None, secret)
    assert error.value.code == ErrorCode.UNAUTHORIZED

    with pytest.raises(AppError):
        await decode_access_token(
            token, None, "another-local-test-secret-at-least-32-bytes"
        )


@pytest.mark.parametrize("algorithm", ["RS256", "ES256"])
@pytest.mark.asyncio
async def test_asymmetric_tokens_resolve_signing_keys_from_supabase_jwks(
    algorithm: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid4()
    private_key = (
        rsa.generate_private_key(public_exponent=65537, key_size=2048)
        if algorithm == "RS256"
        else ec.generate_private_key(ec.SECP256R1())
    )
    token = jwt.encode(
        {
            "sub": str(user_id),
            "aud": "authenticated",
            "role": "authenticated",
            "exp": 4_102_444_800,
        },
        private_key,
        algorithm=algorithm,
        headers={"kid": "supabase-key-id"},
    )
    jwks_urls: list[str] = []

    class JwksClientStub:
        def __init__(self, url: str) -> None:
            self.url = url
            jwks_urls.append(url)

        def get_signing_key_from_jwt(self, received_token: str) -> SimpleNamespace:
            assert received_token == token
            return SimpleNamespace(key=private_key.public_key())

    security._get_jwks_client.cache_clear()
    monkeypatch.setattr(security, "PyJWKClient", JwksClientStub)
    try:
        user = await decode_access_token(
            token,
            "https://project.supabase.co/",
        )
    finally:
        security._get_jwks_client.cache_clear()

    assert user.user_id == user_id
    assert jwks_urls == [
        "https://project.supabase.co/auth/v1/.well-known/jwks.json"
    ]


@pytest.mark.asyncio
async def test_asymmetric_token_requires_configured_supabase_url() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = jwt.encode(
        {
            "sub": str(uuid4()),
            "aud": "authenticated",
            "role": "authenticated",
            "exp": 4_102_444_800,
        },
        private_key,
        algorithm="RS256",
    )

    with pytest.raises(AppError) as error:
        await decode_access_token(token, None)

    assert error.value.code == ErrorCode.UNAUTHORIZED


def test_analysis_response_is_parsed_and_low_confidence_is_flagged() -> None:
    response = parse_analysis_response(
        f"Analysis follows:\n```json\n{valid_model_json(confidence=0.3)}\n```",
        "en",
    )

    assert isinstance(response, AnalysisResult)
    assert "low confidence" in response.disclaimer


@pytest.mark.parametrize(
    "text",
    [
        "No JSON here",
        "```json\nincomplete",
        '{"plant_name": "Basil"}',
        valid_model_json(confidence=1.1),
    ],
)
def test_analysis_response_rejects_malformed_or_invalid_json(text: str) -> None:
    with pytest.raises(InvalidModelResponse):
        parse_analysis_response(text, "fr")


def test_unusable_non_plant_result_is_safely_normalized() -> None:
    result = parse_analysis_response(
        valid_model_json(
            is_plant=False,
            is_healthy=True,
            disease_name=None,
            confidence=0.9,
            symptoms=["irrelevant"],
            causes=["irrelevant"],
            treatment={"organic": ["irrelevant"], "chemical": []},
            prevention=["irrelevant"],
            image_quality="unusable",
        ),
        "fr",
    )

    assert result.confidence == 0.2
    assert not result.is_healthy
    assert result.symptoms == []
    assert result.treatment.organic == []


@pytest.mark.asyncio
async def test_anthropic_provider_corrects_invalid_model_output_once() -> None:
    client = AnthropicClientStub(
        [
            model_response("not json"),
            model_response(valid_model_json()),
        ]
    )
    provider = AnthropicVisionProvider(
        "test-key", "test-model", client=client, max_retries=0
    )

    result = await provider.analyze(b"image", "image/jpeg", "fr", "basil")

    assert result.plant_name == "Basil"
    assert len(client.messages.calls) == 2
    assert "not valid JSON" in str(client.messages.calls[1]["messages"])


@pytest.mark.asyncio
async def test_anthropic_provider_rejects_second_invalid_model_output() -> None:
    provider = AnthropicVisionProvider(
        "test-key",
        "test-model",
        client=AnthropicClientStub(
            [model_response("invalid"), model_response("still invalid")]
        ),
        max_retries=0,
    )

    with pytest.raises(AppError) as error:
        await provider.analyze(b"image", "image/jpeg", "fr", None)

    assert error.value.code == ErrorCode.LLM_INVALID_RESPONSE


@pytest.mark.asyncio
async def test_anthropic_provider_retries_transport_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    client = AnthropicClientStub(
        [
            httpx.ConnectError("offline"),
            model_response(valid_model_json()),
        ]
    )
    provider = AnthropicVisionProvider(
        "test-key", "test-model", client=client, max_retries=1
    )
    sleeps: list[float] = []

    async def fake_sleep(delay: float) -> None:
        sleeps.append(delay)

    monkeypatch.setattr("app.ai.anthropic_provider.asyncio.sleep", fake_sleep)
    result = await provider.analyze(b"image", "image/jpeg", "fr", None)

    assert result.plant_name == "Basil"
    assert len(client.messages.calls) == 2
    assert sleeps == [0.5]


@pytest.mark.asyncio
async def test_anthropic_provider_translates_timeout_and_rejects_heic() -> None:
    async def slow_response() -> object:
        await asyncio.sleep(0.1)
        return model_response(valid_model_json())

    timeout_provider = AnthropicVisionProvider(
        "test-key",
        "test-model",
        timeout=0.001,
        client=AnthropicClientStub([slow_response()]),
        max_retries=0,
    )
    with pytest.raises(AppError) as timeout:
        await timeout_provider.analyze(b"image", "image/jpeg", "fr", None)
    assert timeout.value.code == ErrorCode.LLM_TIMEOUT

    with pytest.raises(AppError) as unsupported:
        await timeout_provider.analyze(b"image", "image/heic", "fr", None)
    assert unsupported.value.code == ErrorCode.UNSUPPORTED_FORMAT


@pytest.mark.asyncio
async def test_provider_does_not_close_injected_client() -> None:
    client = AnthropicClientStub([])
    provider = AnthropicVisionProvider("test-key", "test-model", client=client)

    await provider.aclose()

    assert not client.closed
