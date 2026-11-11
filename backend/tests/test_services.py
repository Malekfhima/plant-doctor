from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest

from app.core.errors import AppError, ErrorCode
from app.schemas.analysis import AnalysisResult, ImageQuality, Severity
from app.schemas.history import ScanCursor
from app.schemas.plants import PlantCreate, PlantPatch, ProfilePatch
from app.services.analysis import AnalysisService
from app.services.history import HistoryService
from app.services.plants import PlantService
from app.services.users import UserService


def analysis_result(**overrides: object) -> AnalysisResult:
    result: dict[str, object] = {
        "plant_name": "Tomato",
        "is_plant": True,
        "is_healthy": False,
        "disease_name": "Leaf spot",
        "confidence": 0.87,
        "severity": Severity.MEDIUM,
        "symptoms": ["Brown spots"],
        "causes": ["Humidity"],
        "treatment": {"organic": ["Remove affected leaves"], "chemical": []},
        "prevention": ["Water the soil"],
        "image_quality": ImageQuality.GOOD,
        "disclaimer": "Informational only.",
    }
    result.update(overrides)
    return AnalysisResult.model_validate(result)


def scan_record(
    *,
    scan_id: UUID | None = None,
    result: AnalysisResult | dict[str, object] | None = None,
    created_at: datetime | None = None,
    image_path: str = "user/scan.jpg",
) -> dict[str, object]:
    analysis = result or analysis_result()
    return {
        "id": str(scan_id or uuid4()),
        "image_path": image_path,
        "result": (
            analysis.model_dump(mode="json")
            if isinstance(analysis, AnalysisResult)
            else analysis
        ),
        "created_at": created_at or datetime.now(timezone.utc),
    }


class FakeProvider:
    def __init__(self, result: AnalysisResult | None = None) -> None:
        self.result = result or analysis_result()
        self.calls = 0

    async def analyze(self, *_args: object) -> AnalysisResult:
        self.calls += 1
        return self.result

    async def aclose(self) -> None:
        pass


class FakeQuotaRepository:
    def __init__(self, error: AppError | None = None) -> None:
        self.error = error
        self.calls: list[tuple[UUID, int]] = []

    async def reserve_daily_scan_quota(self, user_id: UUID, limit: int) -> None:
        self.calls.append((user_id, limit))
        if self.error:
            raise self.error


class FakeScanRepository:
    def __init__(self) -> None:
        self.duplicate: dict[str, object] | None = None
        self.insert_error: AppError | None = None
        self.sign_error: AppError | None = None
        self.records: list[dict[str, object]] = []
        self.uploads: list[tuple[UUID, UUID, bytes]] = []
        self.deleted_images: list[str] = []
        self.deleted_scans: list[tuple[UUID, UUID]] = []
        self.list_result: list[dict[str, object]] = []
        self.list_arguments: dict[str, object] | None = None

    async def find_by_image_hash(
        self,
        _user_id: UUID,
        _image_hash: str,
        _language: str,
    ) -> dict[str, object] | None:
        return self.duplicate

    async def upload_image(
        self,
        user_id: UUID,
        scan_id: UUID,
        content: bytes,
    ) -> str:
        self.uploads.append((user_id, scan_id, content))
        return f"{user_id}/{scan_id}.jpg"

    async def insert_scan(self, record: dict[str, object]) -> dict[str, object]:
        if self.insert_error:
            raise self.insert_error
        saved = {
            **record,
            "created_at": datetime.now(timezone.utc),
        }
        self.records.append(saved)
        return saved

    async def create_signed_url(self, _path: str) -> str:
        if self.sign_error:
            raise self.sign_error
        return "https://storage.example/image.jpg"

    async def create_signed_urls(self, paths: list[str]) -> dict[str, str]:
        return {path: f"https://storage.example/{path}" for path in paths}

    async def delete_image(self, path: str) -> None:
        self.deleted_images.append(path)

    async def delete_scan_record(self, user_id: UUID, scan_id: UUID) -> None:
        self.deleted_scans.append((user_id, scan_id))

    async def list_scans(self, user_id: UUID, **kwargs: object) -> list[dict[str, object]]:
        self.list_arguments = {"user_id": user_id, **kwargs}
        return self.list_result

    async def get_scan(
        self, _user_id: UUID, scan_id: UUID
    ) -> dict[str, object] | None:
        return next(
            (record for record in self.list_result if record["id"] == str(scan_id)),
            None,
        )


class FakePlantRepository:
    def __init__(self) -> None:
        self.plant = self.plant_record()
        self.linked_scan: dict[str, object] | None = scan_record()
        self.deleted = False
        self.delete_result = True
        self.deleted_ids: list[UUID] = []
        self.update_values: dict[str, object] | None = None
        self.scans: list[dict[str, object]] = []

    @staticmethod
    def plant_record(plant_id: UUID | None = None) -> dict[str, object]:
        now = datetime.now(timezone.utc)
        return {
            "id": str(plant_id or uuid4()),
            "name": "Basil",
            "species": "Ocimum basilicum",
            "notes": None,
            "created_at": now,
            "updated_at": now,
        }

    async def create_plant(self, _user_id: UUID, values: dict[str, object]) -> dict[str, object]:
        return {**self.plant, **values}

    async def link_scan(
        self, _user_id: UUID, _plant_id: UUID, _scan_id: UUID
    ) -> dict[str, object] | None:
        return self.linked_scan

    async def list_plants(self, _user_id: UUID) -> list[dict[str, object]]:
        return [self.plant]

    async def get_plant(
        self, _user_id: UUID, _plant_id: UUID
    ) -> dict[str, object] | None:
        return None if self.deleted else self.plant

    async def list_plant_scans(
        self, _user_id: UUID, _plant_id: UUID
    ) -> list[dict[str, object]]:
        return self.scans

    async def update_plant(
        self, _user_id: UUID, _plant_id: UUID, values: dict[str, object]
    ) -> dict[str, object] | None:
        self.update_values = values
        return {**self.plant, **values} if not self.deleted else None

    async def delete_plant(self, _user_id: UUID, plant_id: UUID) -> bool:
        if self.delete_result:
            self.deleted = True
        self.deleted_ids.append(plant_id)
        return self.delete_result


class FakeUserRepository:
    def __init__(self) -> None:
        now = datetime.now(timezone.utc)
        self.profile: dict[str, object] = {
            "id": str(uuid4()),
            "language": "fr",
            "theme": "system",
            "notifications": True,
            "created_at": now,
            "updated_at": now,
        }
        self.updated_values: dict[str, object] | None = None
        self.deleted_user: UUID | None = None

    async def get_profile(self, _user_id: UUID) -> dict[str, object]:
        return self.profile

    async def update_profile(
        self, _user_id: UUID, values: dict[str, object]
    ) -> dict[str, object]:
        self.updated_values = values
        return {**self.profile, **values}

    async def delete_user(self, user_id: UUID) -> None:
        self.deleted_user = user_id


def test_analysis_saves_normalized_result_and_reserves_quota(png_image: bytes) -> None:
    async def run() -> None:
        user_id = uuid4()
        provider = FakeProvider()
        repository = FakeScanRepository()
        quota = FakeQuotaRepository()
        service = AnalysisService(provider, repository, quota, 8, 5)

        response = await service.analyze(user_id, png_image, "en", "basil", True)

        assert response.scan_id is not None
        assert response.image_url == "https://storage.example/image.jpg"
        assert response.plant_name == "Tomato"
        assert len(repository.uploads) == 1
        assert len(repository.records) == 1
        assert quota.calls == [(user_id, 5)]
        assert provider.calls == 1

    import asyncio

    asyncio.run(run())


@pytest.mark.asyncio
async def test_analysis_duplicate_cache_skips_quota_and_provider(png_image: bytes) -> None:
    user_id = uuid4()
    provider = FakeProvider()
    repository = FakeScanRepository()
    repository.duplicate = scan_record()
    quota = FakeQuotaRepository()

    response = await AnalysisService(provider, repository, quota, 8, 5).analyze(
        user_id, png_image, "fr", None, True
    )

    assert response.scan_id is not None
    assert response.image_url == "https://storage.example/image.jpg"
    assert not quota.calls
    assert provider.calls == 0
    assert not repository.uploads


@pytest.mark.asyncio
async def test_unsaved_analysis_does_not_read_or_write_repository(
    png_image: bytes,
) -> None:
    user_id = uuid4()
    provider = FakeProvider()
    repository = FakeScanRepository()
    quota = FakeQuotaRepository()

    response = await AnalysisService(provider, repository, quota, 8, 5).analyze(
        user_id, png_image, "ar", None, False
    )

    assert response.scan_id is None
    assert response.image_url is None
    assert response.created_at.tzinfo is not None
    assert quota.calls == [(user_id, 5)]
    assert provider.calls == 1
    assert not repository.uploads
    assert repository.duplicate is None


@pytest.mark.asyncio
async def test_quota_error_prevents_provider_call(png_image: bytes) -> None:
    provider = FakeProvider()
    quota = FakeQuotaRepository(
        AppError(ErrorCode.QUOTA_EXCEEDED, "Quota reached.", 429)
    )

    with pytest.raises(AppError) as error:
        await AnalysisService(
            provider, FakeScanRepository(), quota, 8, 5
        ).analyze(uuid4(), png_image, "fr", None, False)

    assert error.value.code == ErrorCode.QUOTA_EXCEEDED
    assert provider.calls == 0


@pytest.mark.asyncio
async def test_failed_scan_insert_cleans_up_uploaded_image(png_image: bytes) -> None:
    repository = FakeScanRepository()
    repository.insert_error = AppError(
        ErrorCode.SUPABASE_UNAVAILABLE, "Database unavailable.", 503
    )
    service = AnalysisService(
        FakeProvider(), repository, FakeQuotaRepository(), 8, 5
    )

    with pytest.raises(AppError):
        await service.analyze(uuid4(), png_image, "fr", None, True)

    assert len(repository.uploads) == 1
    assert repository.deleted_images == [
        f"{repository.uploads[0][0]}/{repository.uploads[0][1]}.jpg"
    ]


@pytest.mark.asyncio
async def test_signed_url_error_cleans_up_scan_and_image(png_image: bytes) -> None:
    repository = FakeScanRepository()
    repository.sign_error = AppError(
        ErrorCode.SUPABASE_UNAVAILABLE, "Storage unavailable.", 503
    )
    service = AnalysisService(
        FakeProvider(), repository, FakeQuotaRepository(), 8, 5
    )

    with pytest.raises(AppError):
        await service.analyze(uuid4(), png_image, "fr", None, True)

    saved = repository.records[0]
    assert repository.deleted_scans == [
        (UUID(str(saved["user_id"])), UUID(str(saved["id"])))
    ]
    assert repository.deleted_images == [str(saved["image_path"])]


@pytest.mark.asyncio
async def test_analysis_rejects_malformed_cached_result(png_image: bytes) -> None:
    repository = FakeScanRepository()
    repository.duplicate = {**scan_record(), "result": None}

    with pytest.raises(AppError) as error:
        await AnalysisService(
            FakeProvider(), repository, FakeQuotaRepository(), 8, 5
        ).analyze(uuid4(), png_image, "fr", None, True)

    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_history_lists_page_and_encodes_next_cursor() -> None:
    user_id = uuid4()
    records = [
        scan_record(created_at=datetime(2026, 1, day, tzinfo=timezone.utc))
        for day in (3, 2, 1)
    ]
    repository = FakeScanRepository()
    repository.list_result = records

    page = await HistoryService(repository).list_history(
        user_id,
        limit=2,
        cursor=None,
        query_text="  tomato ",
        status="diseased",
    )

    assert len(page.items) == 2
    assert page.items[0].image_url == f"https://storage.example/{records[0]['image_path']}"
    assert page.next_cursor is not None
    assert repository.list_arguments == {
        "user_id": user_id,
        "limit": 3,
        "cursor": None,
        "query_text": "tomato",
        "status": "diseased",
    }
    decoded = HistoryService._decode_cursor(page.next_cursor)
    assert decoded.id == UUID(str(records[1]["id"]))
    assert decoded.created_at == datetime(2026, 1, 2, tzinfo=timezone.utc)


@pytest.mark.parametrize("cursor", ["not-base64", "e30", "x" * 513])
@pytest.mark.asyncio
async def test_history_rejects_invalid_cursor(cursor: str) -> None:
    with pytest.raises(AppError) as error:
        await HistoryService(FakeScanRepository()).list_history(
            uuid4(),
            limit=20,
            cursor=cursor,
            query_text=None,
            status=None,
        )

    assert error.value.code == ErrorCode.VALIDATION_ERROR


@pytest.mark.asyncio
async def test_history_rejects_cursor_without_timezone() -> None:
    with pytest.raises(ValueError):
        ScanCursor(created_at=datetime(2026, 1, 1), id=uuid4())


@pytest.mark.asyncio
async def test_history_get_and_delete_scan() -> None:
    user_id = uuid4()
    record = scan_record()
    repository = FakeScanRepository()
    repository.list_result = [record]
    service = HistoryService(repository)
    scan_id = UUID(str(record["id"]))

    response = await service.get_scan(user_id, scan_id)
    await service.delete_scan(user_id, scan_id)

    assert response.scan_id == scan_id
    assert repository.deleted_images == [str(record["image_path"])]
    assert repository.deleted_scans == [(user_id, scan_id)]


@pytest.mark.asyncio
async def test_history_missing_scan_returns_not_found() -> None:
    with pytest.raises(AppError) as error:
        await HistoryService(FakeScanRepository()).get_scan(uuid4(), uuid4())

    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_history_rejects_malformed_record() -> None:
    repository = FakeScanRepository()
    repository.list_result = [{**scan_record(), "result": None}]

    with pytest.raises(AppError) as error:
        await HistoryService(repository).list_history(
            uuid4(), limit=5, cursor=None, query_text=None, status=None
        )

    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_plant_create_link_list_get_update_delete() -> None:
    user_id = uuid4()
    plant_repository = FakePlantRepository()
    scan_repository = FakeScanRepository()
    service = PlantService(plant_repository, scan_repository)
    scan_id = uuid4()

    created = await service.create_plant(
        user_id, PlantCreate(name="Basil", species="Ocimum basilicum", scan_id=scan_id)
    )
    listed = await service.list_plants(user_id)
    plant_repository.scans = [scan_record()]
    detailed = await service.get_plant(user_id, created.id)
    updated = await service.update_plant(
        user_id, created.id, PlantPatch(notes="Window ledge")
    )
    linked = await service.link_scan(user_id, created.id, scan_id)
    await service.delete_plant(user_id, created.id)

    assert created.name == "Basil"
    assert len(listed) == 1
    assert len(detailed.scans) == 1
    assert updated.notes == "Window ledge"
    assert plant_repository.update_values == {"notes": "Window ledge"}
    assert linked.scan_id == UUID(str(plant_repository.linked_scan["id"]))
    assert plant_repository.deleted


@pytest.mark.asyncio
async def test_plant_creation_cleans_up_if_linked_scan_is_missing() -> None:
    plants = FakePlantRepository()
    plants.linked_scan = None
    service = PlantService(plants, FakeScanRepository())

    with pytest.raises(AppError) as error:
        await service.create_plant(uuid4(), PlantCreate(name="Basil", scan_id=uuid4()))

    assert error.value.status_code == 404
    assert plants.deleted


@pytest.mark.asyncio
async def test_plant_missing_resources_return_not_found() -> None:
    plants = FakePlantRepository()
    plants.deleted = True
    plants.delete_result = False
    service = PlantService(plants, FakeScanRepository())
    plant_id = uuid4()

    with pytest.raises(AppError):
        await service.get_plant(uuid4(), plant_id)
    with pytest.raises(AppError):
        await service.update_plant(uuid4(), plant_id, PlantPatch(notes="note"))
    with pytest.raises(AppError):
        await service.delete_plant(uuid4(), plant_id)
    with pytest.raises(AppError):
        await service.link_scan(uuid4(), plant_id, uuid4())


@pytest.mark.asyncio
async def test_plant_detail_rejects_malformed_scan_result() -> None:
    plants = FakePlantRepository()
    plants.scans = [{**scan_record(), "result": None}]

    with pytest.raises(AppError) as error:
        await PlantService(plants, FakeScanRepository()).get_plant(uuid4(), uuid4())

    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_user_service_reads_updates_and_deletes_profile() -> None:
    user_id = uuid4()
    repository = FakeUserRepository()
    service = UserService(repository)

    profile = await service.get_profile(user_id)
    updated = await service.update_profile(
        user_id, ProfilePatch(language="en", notifications=False)
    )
    await service.delete_account(user_id)

    assert profile.language == "fr"
    assert updated.language == "en"
    assert updated.notifications is False
    assert repository.updated_values == {"language": "en", "notifications": False}
    assert repository.deleted_user == user_id
