from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="COMPOSER_", env_file=".env", extra="ignore"
    )

    # Phase 1 uses SQLite; the SQLAlchemy models are portable to Postgres via this URL.
    database_url: str = "sqlite:///./storage/composer.db"
    storage_dir: Path = Path("./storage")
    max_upload_bytes: int = 200 * 1024 * 1024
    cors_origins: list[str] = ["http://localhost:3000"]


def get_settings() -> Settings:
    return Settings()
