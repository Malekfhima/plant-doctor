import asyncio
import base64
import json

import httpx
from pydantic import ValidationError

from app.ai.base import VisionProvider
from app.ai.prompts import build_system_prompt, build_user_prompt
from app.core.errors import AppError, ErrorCode
from app.schemas.analysis import AnalysisResult, ImageQuality, Language

GEMINI_SUPPORTED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}

LOW_CONFIDENCE_WARNINGS: dict[Language, str] = {
    "fr": "Attention : cette analyse a une faible confiance et doit être vérifiée.",
    "en": "Warning: this analysis has low confidence and should be verified.",
    "ar": "تنبيه: موثوقية هذا التحليل منخفضة وينبغي التحقق منه.",
}


class GeminiVisionProvider(VisionProvider):
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.0-flash",
        timeout: float = 30,
        *,
        max_retries: int = 2,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        if not api_key:
            raise ValueError("A Gemini API key is required.")
        if not model.strip():
            raise ValueError("Gemini model name must not be empty.")
        if not isinstance(timeout, (int, float)) or timeout <= 0:
            raise ValueError("timeout must be a positive number.")
        self._api_key = api_key
        self._model = model.strip()
        self._timeout = float(timeout)
        self._max_retries = max(0, int(max_retries))
        self._client = client or httpx.AsyncClient()
        self._owns_client = client is None

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def analyze(
        self,
        image_bytes: bytes,
        media_type: str,
        language: Language,
        plant_hint: str | None,
    ) -> AnalysisResult:
        if media_type not in GEMINI_SUPPORTED_MEDIA_TYPES:
            raise AppError(
                ErrorCode.UNSUPPORTED_FORMAT,
                "The Gemini vision provider accepts JPEG, PNG, WebP, or HEIC images.",
                status_code=415,
            )

        system_prompt = build_system_prompt(language)
        user_prompt = build_user_prompt(plant_hint)
        encoded_image = base64.b64encode(image_bytes).decode("ascii")

        messages = [
            {
                "role": "user",
                "parts": [
                    {"inlineData": {"mimeType": media_type, "data": encoded_image}},
                    {"text": user_prompt},
                ],
            }
        ]

        first_response = await self._request(system_prompt, messages)
        try:
            return self._parse(first_response, language)
        except _GeminiParseError:
            messages.extend(
                [
                    {"role": "model", "parts": [{"text": first_response}]},
                    {
                        "role": "user",
                        "parts": [
                            {
                                "text": (
                                    "Your previous response was not valid JSON matching the "
                                    "required schema. Correct it and return only one valid JSON "
                                    "object, without markdown or extra text."
                                )
                            }
                        ],
                    },
                ]
            )

        corrected_response = await self._request(system_prompt, messages)
        try:
            return self._parse(corrected_response, language)
        except _GeminiParseError as exc:
            raise AppError(
                ErrorCode.LLM_INVALID_RESPONSE,
                "The Gemini vision provider returned an invalid analysis response.",
                status_code=502,
            ) from exc

    async def _request(
        self,
        system_prompt: str,
        messages: list[dict[str, object]],
    ) -> str:
        last_error: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                response = await asyncio.wait_for(
                    self._client.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/{self._model}:generateContent",
                        params={"key": self._api_key},
                        json={
                            "systemInstruction": {"parts": [{"text": system_prompt}]},
                            "contents": messages,
                            "generationConfig": {
                                "maxOutputTokens": 2048,
                                "temperature": 0,
                            },
                        },
                        timeout=self._timeout,
                    ),
                    timeout=self._timeout,
                )
            except (asyncio.TimeoutError, httpx.TimeoutException) as exc:
                last_error = exc
                if attempt == self._max_retries:
                    raise AppError(
                        ErrorCode.LLM_TIMEOUT,
                        "The Gemini vision provider timed out.",
                        status_code=504,
                    ) from exc
            except httpx.RequestError as exc:
                last_error = exc
                if attempt == self._max_retries:
                    raise AppError(
                        ErrorCode.LLM_UPSTREAM_ERROR,
                        "The Gemini vision provider could not be reached.",
                        status_code=502,
                    ) from exc
            else:
                if response.status_code == 429:
                    last_error = AppError(
                        ErrorCode.LLM_UPSTREAM_ERROR,
                        "The Gemini vision provider is temporarily unavailable.",
                        status_code=502,
                    )
                    if attempt == self._max_retries:
                        raise last_error from None
                elif response.status_code >= 500:
                    last_error = AppError(
                        ErrorCode.LLM_UPSTREAM_ERROR,
                        "The Gemini vision provider is temporarily unavailable.",
                        status_code=502,
                    )
                    if attempt == self._max_retries:
                        raise last_error from None
                elif response.status_code >= 400:
                    raise AppError(
                        ErrorCode.LLM_UPSTREAM_ERROR,
                        "The Gemini vision provider rejected the analysis request.",
                        status_code=502,
                    )

                try:
                    body = response.json()
                except (ValueError, httpx.InvalidJSONError) as exc:
                    last_error = exc
                    if attempt == self._max_retries:
                        raise AppError(
                            ErrorCode.LLM_UPSTREAM_ERROR,
                            "The Gemini vision provider returned an invalid response.",
                            status_code=502,
                        ) from exc
                else:
                    text = self._extract_text(body)
                    if text:
                        return text
                    last_error = AppError(
                        ErrorCode.LLM_INVALID_RESPONSE,
                        "The Gemini vision provider returned an empty response.",
                        status_code=502,
                    )
                    if attempt == self._max_retries:
                        raise last_error from None

            await asyncio.sleep(0.5 * (2**attempt))

        raise AppError(
            ErrorCode.LLM_UPSTREAM_ERROR,
            "The Gemini vision provider request failed.",
            status_code=502,
        ) from last_error

    @staticmethod
    def _extract_text(body: object) -> str:
        parts: list[str] = []
        try:
            for candidate in body["candidates"]:
                try:
                    for part in candidate["content"]["parts"]:
                        text = part.get("text")
                        if isinstance(text, str):
                            parts.append(text)
                except (TypeError, KeyError):
                    continue
        except (TypeError, KeyError):
            return ""
        return "\n".join(parts)

    @staticmethod
    def _parse(text: str, language: Language) -> AnalysisResult:
        try:
            payload = _extract_json_object(text)
            result = AnalysisResult.model_validate(payload)
        except (_GeminiParseError, ValidationError) as exc:
            raise _GeminiParseError(
                "The Gemini vision provider response does not match the analysis schema."
            ) from exc
        return _postprocess_result(result, language)


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


def _extract_json_object(text: str) -> dict[str, object]:
    candidate = text.strip()
    if candidate.startswith("```"):
        first_newline = candidate.find("\n")
        last_fence = candidate.rfind("```")
        if first_newline < 0 or last_fence <= first_newline:
            raise _GeminiParseError("The model returned an incomplete code fence.")
        candidate = candidate[first_newline + 1 : last_fence].strip()

    start = candidate.find("{")
    if start < 0:
        raise _GeminiParseError("The model response contains no JSON object.")

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
        raise _GeminiParseError("The model response contains incomplete JSON.")

    try:
        parsed = json.loads(candidate[start:end])
    except json.JSONDecodeError as exc:
        raise _GeminiParseError("The model response contains invalid JSON.") from exc
    if not isinstance(parsed, dict):
        raise _GeminiParseError("The model response must be a JSON object.")
    return parsed


class _GeminiParseError(ValueError):
    pass
