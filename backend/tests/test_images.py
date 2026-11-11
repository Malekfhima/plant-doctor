from io import BytesIO

import pytest
from PIL import Image

from app.core.errors import AppError
from app.utils.hashing import sha256_hex
from app.utils.image import process_image


def encode_image(image: Image.Image, format_name: str, **kwargs: object) -> bytes:
    output = BytesIO()
    image.save(output, format=format_name, **kwargs)
    return output.getvalue()


@pytest.mark.parametrize(
    ("format_name", "expected_size"),
    [
        ("JPEG", (100, 50)),
        ("PNG", (100, 50)),
        ("WEBP", (100, 50)),
    ],
)
def test_image_formats_are_normalized_to_metadata_free_jpeg(
    format_name: str,
    expected_size: tuple[int, int],
) -> None:
    source = encode_image(Image.new("RGB", expected_size, "green"), format_name)

    processed = process_image(source)

    assert processed.media_type == "image/jpeg"
    assert (processed.width, processed.height) == expected_size
    assert processed.image_hash == sha256_hex(processed.data)
    with Image.open(BytesIO(processed.data)) as result:
        assert result.format == "JPEG"
        assert not result.getexif()


def test_exif_orientation_is_applied_and_metadata_is_removed() -> None:
    exif = Image.Exif()
    exif[274] = 6
    exif[0x010F] = "private camera metadata"
    source = encode_image(Image.new("RGB", (2000, 1000), "green"), "JPEG", exif=exif)

    processed = process_image(source)

    assert (processed.width, processed.height) == (512, 1024)
    with Image.open(BytesIO(processed.data)) as result:
        assert not result.getexif()


def test_transparent_image_is_composited_over_white() -> None:
    source = encode_image(
        Image.new("RGBA", (16, 16), (0, 0, 0, 0)),
        "PNG",
    )

    processed = process_image(source)

    with Image.open(BytesIO(processed.data)) as result:
        assert min(result.getpixel((8, 8))) >= 250


def test_large_image_is_resized_without_upscaling() -> None:
    source = encode_image(Image.new("RGB", (2048, 512), "green"), "PNG")

    processed = process_image(source)

    assert (processed.width, processed.height) == (1024, 256)
    small = process_image(encode_image(Image.new("RGB", (64, 32)), "PNG"))
    assert (small.width, small.height) == (64, 32)


@pytest.mark.parametrize(
    ("content", "limit_mb", "expected_code"),
    [
        (b"", 8, "IMAGE_INVALID"),
        (b"not an image", 8, "UNSUPPORTED_FORMAT"),
        (b"\xff\xd8\xffbroken", 8, "IMAGE_INVALID"),
        (b"x", 0, "IMAGE_TOO_LARGE"),
    ],
)
def test_invalid_image_inputs_have_specific_errors(
    content: bytes,
    limit_mb: int,
    expected_code: str,
) -> None:
    with pytest.raises(AppError) as error:
        process_image(content, max_image_mb=limit_mb)

    assert error.value.code.value == expected_code


def test_file_larger_than_eight_megabytes_is_rejected() -> None:
    content = b"\xff\xd8\xff" + b"x" * (8 * 1024 * 1024)

    with pytest.raises(AppError) as error:
        process_image(content)

    assert error.value.code.value == "IMAGE_TOO_LARGE"
    assert error.value.status_code == 413


def test_detected_magic_bytes_must_match_decoded_format() -> None:
    png = encode_image(Image.new("RGB", (8, 8)), "PNG")
    mislabeled = b"\xff\xd8\xff" + png[3:]

    with pytest.raises(AppError) as error:
        process_image(mislabeled)

    assert error.value.code.value == "IMAGE_INVALID"


def test_heic_is_explicitly_rejected_when_decoder_is_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.utils.image as image_utils

    monkeypatch.setattr(image_utils, "register_heif_opener", None)
    heic_header = b"\x00\x00\x00\x18ftypheic" + b"\x00" * 20

    with pytest.raises(AppError) as error:
        process_image(heic_header)

    assert error.value.code.value == "UNSUPPORTED_FORMAT"
