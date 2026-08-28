import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "WOODEX"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "woodex-super-secret-production-key-2026-wood-saas")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # PostgreSQL connection string
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://localhost/woodex_db"
    )

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
