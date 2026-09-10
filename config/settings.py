"""Application settings, sourced from the environment.

Every setting is an env var prefixed ``STACKED_`` (see ``.env.example``). Tests
get their environment from ``config/settings_test.py`` so production defaults
stay strict.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="STACKED_",
        extra="ignore",
    )

    # Deployment environment name: development | test | production.
    env: str = "production"

    # Database connection, as a SQLAlchemy URL. SQLite by default; swap in
    # another driver (e.g. postgresql+psycopg://…) without touching app code.
    database_url: str = "sqlite:///./stacked.db"

    # Expose POST /api/reset (wipe + reseed). Must stay false in production.
    expose_dev_reset: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
