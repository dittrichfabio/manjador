from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/manjador.db"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    secret_key: str = "change-me-in-production-use-a-long-random-string"
    session_max_age: int = 60 * 60 * 24 * 30  # 30 days

    # Upload directory for food photos
    upload_dir: str = "./data/uploads"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure upload dir exists
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
