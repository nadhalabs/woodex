from typing import Literal

from pydantic import SecretStr, ValidationError, field_validator
from pydantic_settings import BaseSettings

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

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return value

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
    raise
