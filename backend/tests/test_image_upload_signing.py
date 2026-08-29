import hashlib

import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from backend.routers import image_uploads_router
from backend.routers.image_uploads_router import (
    _sign_upload_params,
    _tenant_folder,
    create_image_upload_signature,
)
from backend.schemas import ImageUploadSignatureRequest


def test_category_upload_folder_is_scoped_to_authenticated_business():
    assert (
        _tenant_folder("woodex/another-business/categories", "business-123")
        == "woodex/business-123/categories"
    )


def test_product_upload_folder_is_scoped_and_slug_sanitized():
    assert (
        _tenant_folder("woodex/another-business/products/Oak Dining Table!", "business-123")
        == "woodex/business-123/products/oak-dining-table"
    )


def test_unrelated_upload_folder_is_rejected():
    with pytest.raises(HTTPException) as exc_info:
        _tenant_folder("woodex/another-business/avatars", "business-123")
    assert exc_info.value.status_code == 400


def test_signature_uses_secret_without_returning_it():
    folder = "woodex/business-123/categories"
    timestamp = 1_787_999_999
    secret = "server-only-secret"

    signature = _sign_upload_params(folder, timestamp, secret)

    expected = hashlib.sha1(
        f"folder={folder}&timestamp={timestamp}{secret}".encode("utf-8")
    ).hexdigest()
    assert signature == expected
    assert secret not in signature


def test_signature_response_exposes_only_upload_safe_fields(monkeypatch):
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_CLOUD_NAME", "upgh5knm")
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_API_KEY", "public-api-key")
    monkeypatch.setattr(
        image_uploads_router.settings,
        "CLOUDINARY_API_SECRET",
        SecretStr("server-only-secret"),
    )
    monkeypatch.setattr(image_uploads_router.time, "time", lambda: 1_787_999_999)

    response = create_image_upload_signature(
        ImageUploadSignatureRequest(folder="woodex/ignored/categories"),
        business=type("BusinessStub", (), {"id": "business-123"})(),
    )
    payload = response.model_dump()

    assert payload["cloud_name"] == "upgh5knm"
    assert payload["api_key"] == "public-api-key"
    assert payload["folder"] == "woodex/business-123/categories"
    assert "api_secret" not in payload
    assert "server-only-secret" not in str(payload)
