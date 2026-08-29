from typing import Any, List, Literal

from pydantic import SecretStr, ValidationError, field_validator
from pydantic_settings import BaseSettings

DEFAULT_ALLOWED_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

class Settings(BaseSettings):
    PROJECT_NAME: str = "WOODEX"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    APP_ENV: Literal["development", "test", "production"]
    SECRET_KEY: SecretStr
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # PostgreSQL connection string
    DATABASE_URL: str

    ALLOWED_ORIGINS: List[str] = DEFAULT_ALLOWED_ORIGINS

    # Server-only Cloudinary credentials used to sign browser uploads.
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: SecretStr = SecretStr("")

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return value

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> List[str]:
        if value is None or value == "":
            return list(DEFAULT_ALLOWED_ORIGINS)
        if isinstance(value, str):
            raw_origins = [item.strip() for item in value.split(",") if item.strip()]
            if not raw_origins:
                return list(DEFAULT_ALLOWED_ORIGINS)
            value = raw_origins
        if isinstance(value, (list, tuple, set)):
            cleaned: List[str] = []
            for item in value:
                if not isinstance(item, str):
                    raise ValueError("Allowed origins must be strings")
                origin = item.strip().rstrip("/")
                if not origin:
                    continue
                if origin == "*":
                    raise ValueError("Wildcard origin '*' is not allowed when credentials are enabled")
                if not (origin.startswith("http://") or origin.startswith("https://")):
                    raise ValueError(f"Invalid origin scheme for '{origin}'. Must begin with http:// or https://")
                cleaned.append(origin)
            if not cleaned:
                return list(DEFAULT_ALLOWED_ORIGINS)
            return cleaned
        raise ValueError("Invalid format for ALLOWED_ORIGINS")

    class Config:
        env_file = ".env"
        extra = "allow"

try:
    settings = Settings()
except ValidationError as exc:
    missing_or_invalid = {
        error.get("loc", (None,))[0]
        for error in exc.errors()
        if error.get("loc")
    }
    required = missing_or_invalid.intersection({"APP_ENV", "SECRET_KEY", "DATABASE_URL"})
    if required:
        names = ", ".join(sorted(required))
        raise RuntimeError(f"Missing or invalid required configuration: {names}") from None
    if "ALLOWED_ORIGINS" in missing_or_invalid:
        raise RuntimeError(f"Invalid ALLOWED_ORIGINS configuration: {exc}") from None
    raise
