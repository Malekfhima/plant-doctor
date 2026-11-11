from uuid import UUID

from app.repositories.users import UserRepository
from app.schemas.plants import ProfilePatch, ProfileResponse


class UserService:
    def __init__(self, repository: UserRepository) -> None:
        self._repository = repository

    async def get_profile(self, user_id: UUID) -> ProfileResponse:
        profile = await self._repository.get_profile(user_id)
        return ProfileResponse.model_validate(profile)

    async def update_profile(
        self,
        user_id: UUID,
        payload: ProfilePatch,
    ) -> ProfileResponse:
        profile = await self._repository.update_profile(
            user_id,
            payload.model_dump(exclude_unset=True),
        )
        return ProfileResponse.model_validate(profile)

    async def delete_account(self, user_id: UUID) -> None:
        await self._repository.delete_user(user_id)
