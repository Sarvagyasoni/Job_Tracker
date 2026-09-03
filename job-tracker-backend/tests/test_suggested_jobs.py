from unittest.mock import AsyncMock, patch

import docx
import io

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.schemas import JobSearchResult

AT = chr(64)


def email(local, domain="example.com"):
    return local + AT + domain


def _make_pdf_bytes(lines):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    y = 750
    for line in lines:
        c.drawString(100, y, line)
        y -= 20
    c.save()
    return buf.getvalue()


SAMPLE_RESUME_LINES = [
    "Jane Doe",
    "Backend Software Engineer",
    "Built REST APIs using Python and FastAPI.",
    "Designed PostgreSQL schemas and wrote Alembic migrations.",
]


def _upload_sample_resume(client, headers):
    pdf_bytes = _make_pdf_bytes(SAMPLE_RESUME_LINES)
    resp = client.post(
        "/resume", headers=headers, files={"file": ("resume.pdf", pdf_bytes, "application/pdf")}
    )
    assert resp.status_code == 201, resp.text


def test_suggested_jobs_requires_auth(client):
    resp = client.get("/jobs/suggested")
    assert resp.status_code == 401


def test_suggested_jobs_without_resume_returns_404(client, register_and_login):
    _, headers = register_and_login()
    resp = client.get("/jobs/suggested", headers=headers)
    assert resp.status_code == 404


def test_suggested_jobs_without_configured_key_returns_clean_500(
    client, register_and_login, monkeypatch
):
    import app.services.llm_client as llm_module

    monkeypatch.setattr(llm_module.settings, "gemini_api_key", None)

    _, headers = register_and_login()
    _upload_sample_resume(client, headers)

    resp = client.get("/jobs/suggested", headers=headers)
    assert resp.status_code == 500
    assert "GEMINI_API_KEY" in resp.json()["detail"]


def test_suggested_jobs_success(client, register_and_login):
    _, headers = register_and_login()
    _upload_sample_resume(client, headers)

    fake_results = [
        JobSearchResult(
            company="Acme Corp",
            role="Backend Software Engineer",
            link="https://acme.example.com/jobs/1",
            notes="Build cool stuff",
            location="Remote",
            posted_at="2026-08-01T00:00:00Z",
        )
    ]

    with patch(
        "app.routers.jobs.generate_job_search_query"
    ) as mock_generate_query, patch(
        "app.routers.jobs.search_jobs", new=AsyncMock(return_value=fake_results)
    ) as mock_search:
        mock_generate_query.return_value = "Backend Software Engineer Python FastAPI"

        resp = client.get("/jobs/suggested", headers=headers)

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["generated_query"] == "Backend Software Engineer Python FastAPI"
    assert body["page"] == 1
    assert len(body["results"]) == 1
    assert body["results"][0]["company"] == "Acme Corp"

    # Confirm the actual saved resume's text was passed to query generation
    call_args = mock_generate_query.call_args[0]
    assert "Backend Software Engineer" in call_args[0] or "Jane Doe" in call_args[0]

    # Confirm the generated query (not something else) is what got searched
    mock_search.assert_awaited_once()
    assert mock_search.call_args.kwargs.get("query") == "Backend Software Engineer Python FastAPI"


def test_suggested_jobs_respects_page_param(client, register_and_login):
    _, headers = register_and_login()
    _upload_sample_resume(client, headers)

    with patch("app.routers.jobs.generate_job_search_query") as mock_generate_query, patch(
        "app.routers.jobs.search_jobs", new=AsyncMock(return_value=[])
    ) as mock_search:
        mock_generate_query.return_value = "Backend Engineer"

        resp = client.get("/jobs/suggested?page=2", headers=headers)

    assert resp.status_code == 200, resp.text
    assert resp.json()["page"] == 2
    assert mock_search.call_args.kwargs.get("page") == 2


def test_suggested_jobs_cannot_use_another_users_resume(client, register_and_login):
    """Suggested jobs must be generated from the CALLER's own resume, never
    another user's, even though no resume id ever appears in the URL."""
    _, headers1 = register_and_login(email=email("suggestedowner"))
    _, headers2 = register_and_login(email=email("suggestedother"))

    _upload_sample_resume(client, headers1)

    # user2 has no resume of their own - should 404, not somehow use user1's
    resp = client.get("/jobs/suggested", headers=headers2)
    assert resp.status_code == 404