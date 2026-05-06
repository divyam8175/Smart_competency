from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    """Application-wide configuration derived from environment variables."""

    mongodb_uri: str
    mongodb_db_name: str = "smart_competency_builder"

    # Groq AI runtime
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_timeout: int = 120  # Timeout in seconds for AI operations

    # Legacy Ollama settings (kept for backward compat but unused)
    ollama_host: str = "http://localhost:11434"
    ollama_summary_model: str = "llama3.2:latest"
    ollama_analysis_model: str | None = None
    ollama_timeout: int = 300
    ollama_max_context: int = 8192

    # JWT Authentication
    secret_key: str = "your-secret-key-change-in-production-min-32-chars-long"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    minio_endpoint: str | None = None
    redis_url: str | None = None
    qdrant_url: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[arg-type]


# Singleton instance for convenience
settings = get_settings()
