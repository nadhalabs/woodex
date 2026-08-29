import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import Settings, DEFAULT_ALLOWED_ORIGINS
from backend.main import app


client = TestClient(app)


def test_default_allowed_origins_when_not_configured():
    # Test default development origins
    settings = Settings(
        APP_ENV="development",
        SECRET_KEY="a" * 32,
        DATABASE_URL="postgresql://localhost/test",
    )
    assert settings.ALLOWED_ORIGINS == [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def test_empty_or_none_allowed_origins_uses_defaults():
    # None or empty string fallback
    settings_none = Settings(
        APP_ENV="development",
        SECRET_KEY="a" * 32,
        DATABASE_URL="postgresql://localhost/test",
        ALLOWED_ORIGINS=None,
    )
    assert settings_none.ALLOWED_ORIGINS == DEFAULT_ALLOWED_ORIGINS

    settings_empty = Settings(
        APP_ENV="development",
        SECRET_KEY="a" * 32,
        DATABASE_URL="postgresql://localhost/test",
        ALLOWED_ORIGINS="",
    )
    assert settings_empty.ALLOWED_ORIGINS == DEFAULT_ALLOWED_ORIGINS

    settings_whitespace = Settings(
        APP_ENV="development",
        SECRET_KEY="a" * 32,
        DATABASE_URL="postgresql://localhost/test",
        ALLOWED_ORIGINS="   ",
    )
    assert settings_whitespace.ALLOWED_ORIGINS == DEFAULT_ALLOWED_ORIGINS


def test_comma_separated_origins_parsing():
    settings = Settings(
        APP_ENV="production",
        SECRET_KEY="a" * 32,
        DATABASE_URL="postgresql://localhost/test",
        ALLOWED_ORIGINS="https://woodex.vercel.app,https://www.example.com",
    )
    assert settings.ALLOWED_ORIGINS == [
        "https://woodex.vercel.app",
        "https://www.example.com",
    ]


def test_origins_trimmed_whitespace_and_trailing_slashes():
    settings = Settings(
        APP_ENV="production",
        SECRET_KEY="a" * 32,
        DATABASE_URL="postgresql://localhost/test",
        ALLOWED_ORIGINS="  https://woodex.vercel.app/ ,  https://app.woodex.com/  , https://admin.woodex.com ",
    )
    assert settings.ALLOWED_ORIGINS == [
        "https://woodex.vercel.app",
        "https://app.woodex.com",
        "https://admin.woodex.com",
    ]


def test_list_of_origins_supported():
    settings = Settings(
        APP_ENV="production",
        SECRET_KEY="a" * 32,
        DATABASE_URL="postgresql://localhost/test",
        ALLOWED_ORIGINS=["https://woodex.vercel.app", "https://app.woodex.com/"],
    )
    assert settings.ALLOWED_ORIGINS == [
        "https://woodex.vercel.app",
        "https://app.woodex.com",
    ]


def test_wildcard_origin_rejected():
    # Direct wildcard rejected
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            SECRET_KEY="a" * 32,
            DATABASE_URL="postgresql://localhost/test",
            ALLOWED_ORIGINS="*",
        )
    assert "Wildcard origin '*' is not allowed when credentials are enabled" in str(exc_info.value)

    # Wildcard in list rejected
    with pytest.raises(ValidationError) as exc_info_list:
        Settings(
            APP_ENV="production",
            SECRET_KEY="a" * 32,
            DATABASE_URL="postgresql://localhost/test",
            ALLOWED_ORIGINS="https://woodex.vercel.app, *",
        )
    assert "Wildcard origin '*' is not allowed when credentials are enabled" in str(exc_info_list.value)


def test_invalid_scheme_rejected():
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            APP_ENV="production",
            SECRET_KEY="a" * 32,
            DATABASE_URL="postgresql://localhost/test",
            ALLOWED_ORIGINS="ftp://woodex.com",
        )
    assert "Invalid origin scheme" in str(exc_info.value)


def test_cors_preflight_and_headers_allowed_origin():
    # Test preflight OPTIONS request for allowed origin (default localhost:3000)
    response = client.options(
        "/api/v1/auth/me",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_headers_disallowed_origin():
    # Test preflight OPTIONS request for unauthorized origin
    response = client.options(
        "/api/v1/auth/me",
        headers={
            "Origin": "https://unauthorized-malicious-site.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Disallowed origin must not receive Access-Control-Allow-Origin
    assert "access-control-allow-origin" not in response.headers


def test_cors_middleware_with_custom_production_origins():
    # Test a test FastAPI app using custom configured origins
    prod_origins = ["https://woodex.vercel.app", "https://custom.woodex.com"]
    test_app = FastAPI()
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=prod_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @test_app.get("/ping")
    def ping():
        return {"ping": "pong"}

    test_client = TestClient(test_app)

    # Allowed production origin
    res = test_client.get("/ping", headers={"Origin": "https://woodex.vercel.app"})
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "https://woodex.vercel.app"
    assert res.headers.get("access-control-allow-credentials") == "true"

    # Disallowed origin
    res_disallowed = test_client.get("/ping", headers={"Origin": "http://localhost:3000"})
    assert res_disallowed.status_code == 200
    assert "access-control-allow-origin" not in res_disallowed.headers
