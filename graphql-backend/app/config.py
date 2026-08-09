import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is required. Copy graphql-backend/.env.example to .env and set it.",
    )


def cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "").strip()
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    if not origins:
        raise RuntimeError(
            "CORS_ORIGINS is required. Copy graphql-backend/.env.example to .env and set it.",
        )
    return origins
