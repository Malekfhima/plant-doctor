import warnings
from dataclasses import dataclass
from io import BytesIO
from typing import Final

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.errors import AppError, ErrorCode
from app.utils.hashing import sha256_hex

try:
    from pillow_heif import register_heif_opener
except ImportError:
    register_heif_opener = None

if register_heif_opener is not None:
    register_heif_opener()

JPEG_SIGNATURE: Final = b"\xff\xd8\xff"
PNG_SIGNATURE: Final = b"\x89PNG\r\n\x1a\n"
HEIC_BRANDS: Final = {b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1"}
PIL_FORMATS: Final = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/heic": "HEIF",
}
MAX_IMAGE_SIDE: Final = 1024
MAX_IMAGE_SIZE: Final = (MAX_IMAGE_SIDE, MAX_IMAGE_SIDE)


@dataclass(frozen=True, slots=True)
class ProcessedImage:
    data: bytes
    media_type: str
    image_hash: str
    width: int
    height: int


def _detect_media_type(image_bytes: bytes) -> str | None:
    if image_bytes.startswith(JPEG_SIGNATURE):
        return "image/jpeg"
    if image_bytes.startswith(PNG_SIGNATURE):
        return "image/png"
    if (
        len(image_bytes) >= 12
        and image_bytes[:4] == b"RIFF"
        and image_bytes[8:12] == b"WEBP"
    ):
        return "image/webp"
    if (
        len(image_bytes) >= 12
        and image_bytes[4:8] == b"ftyp"
        and image_bytes[8:12] in HEIC_BRANDS
    ):
        return "image/heic"
    return None


def process_image(image_bytes: bytes, max_image_mb: int = 8) -> ProcessedImage:
    if not image_bytes:
        raise AppError(
            ErrorCode.IMAGE_INVALID,
            "The uploaded image is empty.",
            status_code=400,
        )

    if len(image_bytes) > max_image_mb * 1024 * 1024:
        raise AppError(
            ErrorCode.IMAGE_TOO_LARGE,
            f"The image must be no larger than {max_image_mb} MB.",
            status_code=413,
        )

    media_type = _detect_media_type(image_bytes)
    if media_type is None:
        raise AppError(
            ErrorCode.UNSUPPORTED_FORMAT,
            "Upload a JPEG, PNG, WebP, or HEIC image.",
            status_code=415,
        )
    if media_type == "image/heic" and register_heif_opener is None:
        raise AppError(
            ErrorCode.UNSUPPORTED_FORMAT,
            "HEIC decoding support is unavailable.",
            status_code=415,
        )

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(image_bytes)) as source:
                if source.format != PIL_FORMATS[media_type]:
                    raise UnidentifiedImageError(
                        "Image content does not match its detected format."
                    )
                source.verify()

            with Image.open(BytesIO(image_bytes)) as source:
                oriented = ImageOps.exif_transpose(source)
                if "A" in oriented.getbands() or "transparency" in oriented.info:
                    rgba = oriented.convert("RGBA")
                    background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
                    normalized = Image.alpha_composite(background, rgba).convert("RGB")
                else:
                    normalized = oriented.convert("RGB")
                normalized.thumbnail(MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)
                output = BytesIO()
                normalized.save(
                    output,
                    format="JPEG",
                    quality=85,
                    optimize=True,
                    exif=b"",
                )
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        UnidentifiedImageError,
        OSError,
        ValueError,
        EOFError,
        SyntaxError,
    ) as exc:
        raise AppError(
            ErrorCode.IMAGE_INVALID,
            "The image is corrupted or cannot be decoded.",
            status_code=400,
        ) from exc

    processed_bytes = output.getvalue()
    return ProcessedImage(
        data=processed_bytes,
        media_type="image/jpeg",
        image_hash=sha256_hex(processed_bytes),
        width=normalized.width,
        height=normalized.height,
    )
