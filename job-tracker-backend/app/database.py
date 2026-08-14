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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


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
