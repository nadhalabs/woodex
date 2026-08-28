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
    DATABASE_URL: str = "postgresql://localhost/woodex_db"

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
    if any(error.get("loc") == ("SECRET_KEY",) for error in exc.errors()):
        raise RuntimeError("SECRET_KEY must be set and contain at least 32 characters") from None
    raise
