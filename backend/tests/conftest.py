from io import BytesIO
from uuid import UUID, uuid4

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from PIL import Image

from app.api.deps import get_current_user
from app.core.security import AuthenticatedUser
from app.main import app


@pytest.fixture
def png_image() -> bytes:
    output = BytesIO()
    Image.new("RGB", (40, 30), "green").save(output, format="PNG")
    return output.getvalue()


@pytest.fixture
def api_client():
    app.dependency_overrides.clear()
    user_id = uuid4()

    def authenticated_user(request: Request) -> AuthenticatedUser:
        request.state.user_id = str(user_id)
        return AuthenticatedUser(user_id=user_id)

    app.dependency_overrides[get_current_user] = authenticated_user
    with TestClient(app) as client:
        yield client, user_id
    app.dependency_overrides.clear()
