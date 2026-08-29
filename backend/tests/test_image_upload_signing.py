import hashlib
import uuid
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import SecretStr

from backend.main import app
from backend.auth import create_access_token
from backend.database import SessionLocal
from backend.models import Business, Category, Product, User
from backend.routers import image_uploads_router
from backend.routers.image_uploads_router import (
    _sign_upload_params,
    create_image_upload_signature,
)
from backend.schemas import ImageUploadSignatureRequest
from backend.seed import seed_database

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database(confirm_destructive=True)


def get_auth_headers(email: str) -> dict:
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": "WoodexTest123!"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_signature_uses_sha1_parameter_signing_without_exposing_secret():
    folder = "woodex/business-123/categories"
    timestamp = 1_787_999_999
    secret = "server-only-secret"

    signature = _sign_upload_params(folder, timestamp, secret)

    expected = hashlib.sha1(
        f"folder={folder}&timestamp={timestamp}{secret}".encode("utf-8")
    ).hexdigest()
    assert signature == expected
    assert secret not in signature


def test_category_signature_scopes_folder_to_authenticated_business(monkeypatch):
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_CLOUD_NAME", "upgh5knm")
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_API_KEY", "public-api-key")
    monkeypatch.setattr(
        image_uploads_router.settings,
        "CLOUDINARY_API_SECRET",
        SecretStr("server-only-secret"),
    )

    headers_a = get_auth_headers("owner@oakwood.com")
    categories_a = client.get("/api/v1/categories", headers=headers_a).json()
    cat_a = categories_a[0]

    res = client.post(
        "/api/v1/image-uploads/signature",
        json={"resource_type": "category", "resource_id": cat_a["id"]},
        headers=headers_a,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["cloud_name"] == "upgh5knm"
    assert data["api_key"] == "public-api-key"
    assert data["folder"] == f"woodex/{cat_a['business_id']}/categories"
    assert "api_secret" not in data


def test_product_signature_scopes_folder_and_sanitizes_slug(monkeypatch):
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_CLOUD_NAME", "upgh5knm")
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_API_KEY", "public-api-key")
    monkeypatch.setattr(
        image_uploads_router.settings,
        "CLOUDINARY_API_SECRET",
        SecretStr("server-only-secret"),
    )

    headers_a = get_auth_headers("owner@oakwood.com")
    products_a = client.get("/api/v1/products", headers=headers_a).json()
    prod_a = products_a[0]

    res = client.post(
        "/api/v1/image-uploads/signature",
        json={"resource_type": "product", "resource_id": prod_a["id"]},
        headers=headers_a,
    )
    assert res.status_code == 200
    data = res.json()
    assert f"woodex/{prod_a['business_id']}/products/" in data["folder"]


def test_cross_tenant_resource_signature_request_returns_404(monkeypatch):
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_CLOUD_NAME", "upgh5knm")
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_API_KEY", "public-api-key")
    monkeypatch.setattr(
        image_uploads_router.settings,
        "CLOUDINARY_API_SECRET",
        SecretStr("server-only-secret"),
    )

    headers_a = get_auth_headers("owner@oakwood.com")
    headers_b = get_auth_headers("owner@timbercraft.com")

    # Tenant A's category and product
    cat_a = client.get("/api/v1/categories", headers=headers_a).json()[0]
    prod_a = client.get("/api/v1/products", headers=headers_a).json()[0]

    # Tenant B tries to sign for Tenant A's category -> MUST return 404
    res_cross_cat = client.post(
        "/api/v1/image-uploads/signature",
        json={"resource_type": "category", "resource_id": cat_a["id"]},
        headers=headers_b,
    )
    assert res_cross_cat.status_code == 404

    # Tenant B tries to sign for Tenant A's product -> MUST return 404
    res_cross_prod = client.post(
        "/api/v1/image-uploads/signature",
        json={"resource_type": "product", "resource_id": prod_a["id"]},
        headers=headers_b,
    )
    assert res_cross_prod.status_code == 404


def test_nonexistent_resource_signature_request_returns_404(monkeypatch):
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_CLOUD_NAME", "upgh5knm")
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_API_KEY", "public-api-key")
    monkeypatch.setattr(
        image_uploads_router.settings,
        "CLOUDINARY_API_SECRET",
        SecretStr("server-only-secret"),
    )

    headers_a = get_auth_headers("owner@oakwood.com")
    random_id = str(uuid.uuid4())

    res = client.post(
        "/api/v1/image-uploads/signature",
        json={"resource_type": "product", "resource_id": random_id},
        headers=headers_a,
    )
    assert res.status_code == 404


def test_unconfigured_cloudinary_returns_503(monkeypatch):
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_CLOUD_NAME", "")
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_API_KEY", "")
    monkeypatch.setattr(
        image_uploads_router.settings,
        "CLOUDINARY_API_SECRET",
        SecretStr(""),
    )

    headers_a = get_auth_headers("owner@oakwood.com")
    prod_a = client.get("/api/v1/products", headers=headers_a).json()[0]

    res = client.post(
        "/api/v1/image-uploads/signature",
        json={"resource_type": "product", "resource_id": prod_a["id"]},
        headers=headers_a,
    )
    assert res.status_code == 503
    assert "Image uploads are not configured" in res.json()["detail"]


def test_staff_role_cannot_obtain_upload_signature(monkeypatch):
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_CLOUD_NAME", "upgh5knm")
    monkeypatch.setattr(image_uploads_router.settings, "CLOUDINARY_API_KEY", "public-api-key")
    monkeypatch.setattr(
        image_uploads_router.settings,
        "CLOUDINARY_API_SECRET",
        SecretStr("server-only-secret"),
    )

    # Seeded staff user in TimberCraft: sales@timbercraft.com (role="staff")
    headers_staff = get_auth_headers("sales@timbercraft.com")
    headers_owner = get_auth_headers("owner@timbercraft.com")
    prod_b = client.get("/api/v1/products", headers=headers_owner).json()[0]

    res = client.post(
        "/api/v1/image-uploads/signature",
        json={"resource_type": "product", "resource_id": prod_b["id"]},
        headers=headers_staff,
    )
    assert res.status_code == 403

