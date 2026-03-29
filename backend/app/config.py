import os
from pydantic_settings import BaseSettings
from functools import lru_cache

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Settings(BaseSettings):
    database_path: str = os.environ.get("DATABASE_PATH", os.path.join(BASE_DIR, "data", "cmdmem.db"))
    embedding_model: str = "all-MiniLM-L6-v2"
    allowed_origins: list[str] = ["*"]
    secret_patterns: list[str] = [
        r"(?i)(password|passwd|pwd)\s*[=:]\s*\S+",
        r"(?i)(token|api[_-]?key|secret|auth)\s*[=:]\s*\S+",
        r"(?i)bearer\s+\S+",
        r"(?i)authorization:\s*\S+",
        r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}",
        r"(?i)(aws_secret_access_key|aws_access_key_id)\s*[=:]\s*\S+",
        r"ghp_[A-Za-z0-9]{36}",
        r"sk-[A-Za-z0-9]{20,}",
    ]
    excluded_commands: list[str] = [
        "ls", "cd", "pwd", "clear", "exit", "history",
    ]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
