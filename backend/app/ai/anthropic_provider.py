import asyncio
import base64
import json
import math
from typing import Any

import anthropic
import httpx
from pydantic import ValidationError

from app.ai.base import VisionProvider
from app.ai.prompts import build_system_prompt, build_user_prompt
from app.core.errors import AppError, ErrorCode
from app.schemas.analysis import AnalysisResult, ImageQuality, Language


LOW_CONFIDENCE_WARNINGS: dict[Language, str] = {
    "fr": "Attention : cette analyse a une faible confiance et doit être vérifiée.",
    "en": "Warning: this analysis has low confidence and should be verified.",
    "ar": "تنبيه: موثوقية هذا التحليل منخفضة وينبغي التحقق منه.",
}
SUPPORTED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp"}
INITIAL_RETRY_DELAY_SECONDS = 0.5


class InvalidModelResponse(ValueError):
    pass


def _extract_json_object(text: str) -> dict[str, Any]:
    candidate = text.strip()
    if candidate.startswith("```"):
        first_newline = candidate.find("\n")
        last_fence = candidate.rfind("```")
        if first_newline < 0 or last_fence <= first_newline:
            raise InvalidModelResponse("The model returned an incomplete code fence.")
        candidate = candidate[first_newline + 1 : last_fence].strip()

    start = candidate.find("{")
    if start < 0:
        raise InvalidModelResponse("The model response contains no JSON object.")

    depth = 0
    in_string = False
    escaped = False
    end = -1
    for index in range(start, len(candidate)):
        character = candidate[index]
        if in_string:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
            continue
        if character == '"':
            in_string = True
        elif character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth == 0:
                end = index + 1
                break

    if end < 0:
        raise InvalidModelResponse("The model response contains incomplete JSON.")

    try:
        parsed = json.loads(candidate[start:end])
    except json.JSONDecodeError as exc:
        raise InvalidModelResponse("The model response contains invalid JSON.") from exc
    if not isinstance(parsed, dict):
        raise InvalidModelResponse("The model response must be a JSON object.")
    return parsed


def _postprocess_result(result: AnalysisResult, language: Language) -> AnalysisResult:
    payload = result.model_dump(mode="json")
    confidence = result.confidence
    if not result.is_plant or result.image_quality is ImageQuality.UNUSABLE:
        confidence = min(confidence, 0.2)
        payload.update(
            confidence=confidence,
            is_healthy=False,
            disease_name=None,
            severity=None,
            symptoms=[],
            causes=[],
            treatment={"organic": [], "chemical": []},
            prevention=[],
        )
    if result.is_healthy:
        payload.update(disease_name=None, severity=None)
    if confidence < 0.5:
        disclaimer = result.disclaimer.strip()
        warning = LOW_CONFIDENCE_WARNINGS[language]
        payload["disclaimer"] = f"{disclaimer} {warning}".strip()
    return AnalysisResult.model_validate(payload)


def parse_analysis_response(text: str, language: Language) -> AnalysisResult:
    try:
        payload = _extract_json_object(text)
        result = AnalysisResult.model_validate(payload)
    except (InvalidModelResponse, ValidationError) as exc:
        raise InvalidModelResponse(
            "The model response does not match the analysis schema."
        ) from exc
    return _postprocess_result(result, language)


class AnthropicVisionProvider(VisionProvider):
    def __init__(
        self,
        api_key: str | None,
        model: str,
        timeout: float = 30,
        *,
        max_retries: int = 2,
        client: anthropic.AsyncAnthropic | None = None,
    ) -> None:
        if client is None and not api_key:
            raise ValueError("An Anthropic API key is required.")
        if not math.isfinite(timeout) or timeout <= 0:
            raise ValueError("timeout must be a positive finite number.")
        if not isinstance(max_retries, int) or max_retries < 0:
            raise ValueError("max_retries must be zero or greater.")
        self._client = (
            client
            if client is not None
            else anthropic.AsyncAnthropic(
                api_key=api_key,
                timeout=timeout,
                max_retries=0,
            )
        )
        self._owns_client = client is None
        self._model = model
        self._timeout = timeout
        self._max_retries = max_retries

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.close()

    async def analyze(
        self,
        image_bytes: bytes,
        media_type: str,
        language: Language,
        plant_hint: str | None,
    ) -> AnalysisResult:
        if media_type not in SUPPORTED_MEDIA_TYPES:
            raise AppError(
                ErrorCode.UNSUPPORTED_FORMAT,
                "The vision provider accepts JPEG, PNG, or WebP images.",
                status_code=415,
            )

        encoded_image = base64.b64encode(image_bytes).decode("ascii")
        first_message = {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": encoded_image,
                    },
                },
                {"type": "text", "text": build_user_prompt(plant_hint)},
            ],
        }
        messages: list[dict[str, Any]] = [first_message]
        system_prompt = build_system_prompt(language)

        first_response = await self._request(system_prompt, messages)
        first_text = self._response_text(first_response)
        try:
            return parse_analysis_response(first_text, language)
        except InvalidModelResponse:
            messages.extend(
                [
                    {"role": "assistant", "content": first_text},
                    {
                        "role": "user",
                        "content": (
                            "Your previous response was not valid JSON matching the "
                            "required schema. Correct it and return only one valid JSON "
                            "object, without markdown or extra text."
                        ),
                    },
                ]
            )

        corrected_response = await self._request(system_prompt, messages)
        corrected_text = self._response_text(corrected_response)
        try:
            return parse_analysis_response(corrected_text, language)
        except InvalidModelResponse as exc:
            raise AppError(
                ErrorCode.LLM_INVALID_RESPONSE,
                "The vision provider returned an invalid analysis response.",
                status_code=502,
            ) from exc

    async def _request(
        self,
        system_prompt: str,
        messages: list[dict[str, Any]],
    ) -> Any:
        last_error: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                return await asyncio.wait_for(
                    self._client.messages.create(
                        model=self._model,
                        max_tokens=2048,
                        system=system_prompt,
                        messages=messages,
                    ),
                    timeout=self._timeout,
                )
            except (asyncio.TimeoutError, anthropic.APITimeoutError) as exc:
                last_error = exc
                if attempt == self._max_retries:
                    raise AppError(
                        ErrorCode.LLM_TIMEOUT,
                        "The vision provider timed out.",
                        status_code=504,
                    ) from exc
            except (anthropic.APIConnectionError, httpx.TransportError) as exc:
                last_error = exc
                if attempt == self._max_retries:
                    raise AppError(
                        ErrorCode.LLM_UPSTREAM_ERROR,
                        "The vision provider could not be reached.",
                        status_code=502,
                    ) from exc
            except anthropic.APIStatusError as exc:
                if exc.status_code != 429 and exc.status_code < 500:
                    raise AppError(
                        ErrorCode.LLM_UPSTREAM_ERROR,
                        "The vision provider rejected the analysis request.",
                        status_code=502,
                    ) from exc
                last_error = exc
                if attempt == self._max_retries:
                    raise AppError(
                        ErrorCode.LLM_UPSTREAM_ERROR,
                        "The vision provider is temporarily unavailable.",
                        status_code=502,
                    ) from exc

            await asyncio.sleep(INITIAL_RETRY_DELAY_SECONDS * (2**attempt))

        raise AppError(
            ErrorCode.LLM_UPSTREAM_ERROR,
            "The vision provider request failed.",
            status_code=502,
        ) from last_error

    @staticmethod
    def _response_text(response: Any) -> str:
        text_parts = [
            block.text
            for block in response.content
            if getattr(block, "type", None) == "text"
        ]
        return "\n".join(text_parts)
