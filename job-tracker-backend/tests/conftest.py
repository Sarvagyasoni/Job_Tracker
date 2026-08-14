import os

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Load .env into os.environ BEFORE reading DATABASE_URL below. Without this,
# a DATABASE_URL that only lives in .env (not exported as a real shell env
# var) is invisible here, and tests silently fall back to the hardcoded
# default URL/port/password instead of erroring loudly - which is exactly
# the kind of mismatch that produces a confusing "connection refused on the
# wrong port" error.
load_dotenv()

# Point the app at a separate test database BEFORE importing app modules,
# so app.database's Settings() doesn't lock in the dev DATABASE_URL.
# Falls back to swapping the dev DB name for one suffixed with "_test".
_dev_url = os.environ.get("DATABASE_URL")
if "TEST_DATABASE_URL" in os.environ:
    _test_url = os.environ["TEST_DATABASE_URL"]
elif _dev_url:
    _test_url = _dev_url.rsplit("/", 1)[0] + "/job_tracker_test"
else:
    _test_url = "postgresql://postgres:postgres@localhost:5432/job_tracker_test"

os.environ["DATABASE_URL"] = _test_url
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-tests-only")
os.environ["JSEARCH_API_KEY"] = ""

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

engine = create_engine(_test_url)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def _create_test_schema():
    """Create all tables once for the test session, drop them afterward."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    """Each test runs inside its own outer transaction, which is rolled back
    at the end so tests never leak data into one another.

    Route handlers call db.commit(), which would normally end the outer
    transaction early. To prevent that, we open a SAVEPOINT and transparently
    restart it every time the session's transaction ends (i.e. after each
    commit), so commit() only releases the SAVEPOINT rather than the real
    transaction. See SQLAlchemy docs: "Joining a Session into an External
    Transaction".
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, trans):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def register_and_login(client):
    """Returns a helper that registers + logs in a user and returns
    (user_json, auth_headers)."""

    def _do(email="mainuser" + chr(64) + "example.com", password="password123"):
        resp = client.post("/auth/register", json={"email": email, "password": password})
        assert resp.status_code == 201, resp.text
        user = resp.json()

        resp = client.post("/auth/login", json={"email": email, "password": password})
        assert resp.status_code == 200, resp.text
        token = resp.json()["access_token"]

        headers = {"Authorization": "Bearer " + token}
        return user, headers

    return _do
