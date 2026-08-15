from unittest.mock import AsyncMock, patch

from app.schemas import JobSearchResult


def test_search_requires_auth(client):
    resp = client.get("/jobs/search", params={"query": "backend developer"})
    assert resp.status_code == 401


def test_search_without_configured_key_returns_clean_500(client, register_and_login, monkeypatch):
    """Should fail with a clear, actionable message rather than crashing,
    when no JSEARCH_API_KEY is configured. Explicitly forces the setting to
    None here (rather than relying on .env not having one) so this test
    passes regardless of whether the developer running it happens to have a
    real key configured locally."""
    import app.services.job_search as job_search_module

    monkeypatch.setattr(job_search_module.settings, "jsearch_api_key", None)

    _, headers = register_and_login()
    resp = client.get("/jobs/search", params={"query": "backend developer"}, headers=headers)
    assert resp.status_code == 500
    assert "JSEARCH_API_KEY" in resp.json()["detail"]


def test_search_success_maps_results(client, register_and_login):
    _, headers = register_and_login()

    fake_results = [
        JobSearchResult(
            company="Acme Corp",
            role="Backend Engineer",
            link="https://acme.example.com/jobs/1",
            notes="Build cool stuff",
            location="Remote",
            posted_at="2026-08-01T00:00:00Z",
        )
    ]

    with patch("app.routers.jobs.search_jobs", new=AsyncMock(return_value=fake_results)):
        resp = client.get(
            "/jobs/search", params={"query": "backend developer", "page": 1}, headers=headers
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["query"] == "backend developer"
    assert body["page"] == 1
    assert len(body["results"]) == 1
    assert body["results"][0]["company"] == "Acme Corp"
    assert body["results"][0]["role"] == "Backend Engineer"


def test_search_result_can_be_saved_via_create_job(client, register_and_login):
    """The whole point of search is that a result's fields plug straight
    into POST /jobs. Confirm that handoff actually works."""
    _, headers = register_and_login()

    fake_results = [
        JobSearchResult(
            company="Globex Inc",
            role="Platform Engineer",
            link="https://globex.example.com/careers/42",
            notes="Great team, remote friendly",
            location="Remote",
            posted_at="2026-08-01T00:00:00Z",
        )
    ]

    with patch("app.routers.jobs.search_jobs", new=AsyncMock(return_value=fake_results)):
        resp = client.get("/jobs/search", params={"query": "platform engineer"}, headers=headers)
    result = resp.json()["results"][0]

    create_payload = {
        "company": result["company"],
        "role": result["role"],
        "link": result["link"],
        "notes": result["notes"],
    }
    resp = client.post("/jobs", json=create_payload, headers=headers)
    assert resp.status_code == 201
    saved = resp.json()
    assert saved["company"] == "Globex Inc"
    assert saved["link"] == "https://globex.example.com/careers/42"