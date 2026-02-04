from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    app_name: str = "naver-blog-agent"
    app_env: str = "development"
    debug: bool = True

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/blog_agent.db"

    # Naver API
    naver_client_id: str = ""
    naver_client_secret: str = ""

    # Google Gemini API
    google_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Crawler
    crawler_concurrency: int = 50
    crawler_timeout: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
