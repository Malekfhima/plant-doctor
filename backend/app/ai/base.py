from abc import ABC, abstractmethod

from app.schemas.analysis import AnalysisResult, Language


class VisionProvider(ABC):
    async def aclose(self) -> None:
        return None

    @abstractmethod
    async def analyze(
        self,
        image_bytes: bytes,
        media_type: str,
        language: Language,
        plant_hint: str | None,
    ) -> AnalysisResult:
        raise NotImplementedError
