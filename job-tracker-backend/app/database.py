from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


class Settings(BaseSettings):
    """Reads config from environment variables / a .env file."""

    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # Optional: only required to use GET /jobs/search (OpenWeb Ninja JSearch
    # API). Left optional so the app still starts up fine without it configured yet.
    jsearch_api_key: Optional[str] = None
    # Optional: only required for the ATS scoring and resume bullet-tailoring
    # endpoints (POST /resume/ats-score, POST /resume/tailor-bullets).
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"
    # Comma-separated list of frontend origins allowed to call this API from
    # a browser. Defaults cover the two most common local React dev servers
    # (Vite and Create React App) so it works out of the box; add your
    # teammate's actual dev URL (and later, your deployed frontend URL) here
    # once known.
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

# pool_pre_ping avoids errors from stale/closed connections (common with
# managed Postgres instances like Render that idle-timeout connections)
engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()