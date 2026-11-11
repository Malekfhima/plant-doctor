import asyncio
from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID

import jwt
from jwt import PyJWKClient
from jwt.exceptions import (
    InvalidTokenError,
    PyJWKClientConnectionError,
    PyJWKClientError,
)

from app.core.errors import AppError, ErrorCode


ASYMMETRIC_ALGORITHMS = {"ES256", "RS256"}


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    user_id: UUID


@lru_cache(maxsize=16)
def _get_jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url)


def _unauthorized() -> AppError:
    return AppError(
        ErrorCode.UNAUTHORIZED,
        "The access token is invalid or expired.",
        status_code=401,
    )


async def decode_access_token(
    token: str,
    supabase_url: str | None,
    jwt_secret: str | None = None,
) -> AuthenticatedUser:
    try:
        algorithm = jwt.get_unverified_header(token).get("alg")

        if algorithm == "HS256" and jwt_secret:
            verification_key = jwt_secret
        elif algorithm in ASYMMETRIC_ALGORITHMS and supabase_url:
            jwks_url = (
                f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
            )
            try:
                signing_key = await asyncio.to_thread(
                    _get_jwks_client(jwks_url).get_signing_key_from_jwt,
                    token,
                )
            except PyJWKClientConnectionError as exc:
                raise AppError(
                    ErrorCode.SUPABASE_UNAVAILABLE,
                    "Supabase signing keys are unavailable.",
                    status_code=503,
                ) from exc
            except PyJWKClientError as exc:
                raise _unauthorized() from exc
            verification_key = signing_key.key
        else:
            raise _unauthorized()

        claims = jwt.decode(
            token,
            verification_key,
            algorithms=[algorithm],
            audience="authenticated",
            options={"require": ["exp", "sub", "aud"]},
        )
        if claims.get("role") != "authenticated":
            raise ValueError("Token does not represent an authenticated user.")
        user_id = UUID(claims["sub"])
    except (InvalidTokenError, TypeError, ValueError, KeyError) as exc:
        raise _unauthorized() from exc

    return AuthenticatedUser(user_id=user_id)
