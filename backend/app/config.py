import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass

@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./bartosmulti.db")
    allowed_origins: tuple[str, ...] = tuple(
        origin.strip() for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "https://martin88nagy-ui.github.io"
        ).split(",") if origin.strip()
    )
    session_hours: int = int(os.getenv("SESSION_HOURS", "12"))
    secure_cookies: bool = os.getenv("SECURE_COOKIES", "true").lower() == "true"

settings = Settings()
