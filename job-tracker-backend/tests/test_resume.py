import io
from unittest.mock import patch

import docx
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

AT = chr(64)


def email(local, domain="example.com"):
    return local + AT + domain


def _make_docx_bytes(paragraphs):
    doc = docx.Document()
    for p in paragraphs:
        doc.add_paragraph(p)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


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
    "Software Engineer",
    "Built REST APIs using Python and FastAPI.",
    "Led a team of 3 engineers on a microservices migration.",
]


# ---------- resume upload / management ----------


def test_get_resume_without_uploading_returns_404(client, register_and_login):
    _, headers = register_and_login()
    resp = client.get("/resume", headers=headers)
    assert resp.status_code == 404


def test_resume_endpoints_require_auth(client):
    assert client.get("/resume").status_code == 401
    assert client.delete("/resume").status_code == 401


def test_upload_docx_resume_success(client, register_and_login):
    _, headers = register_and_login()
    docx_bytes = _make_docx_bytes(SAMPLE_RESUME_LINES)

    resp = client.post(
        "/resume",
        headers=headers,
        files={
            "file": (
                "resume.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["original_filename"] == "resume.docx"
    assert "id" in body
    assert "extracted_text" not in body  # never echoed back in the response


def test_upload_pdf_resume_success(client, register_and_login):
    _, headers = register_and_login()
    pdf_bytes = _make_pdf_bytes(SAMPLE_RESUME_LINES)

    resp = client.post(
        "/resume",
        headers=headers,
        files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["original_filename"] == "resume.pdf"


def test_upload_wrong_file_type_rejected(client, register_and_login):
    _, headers = register_and_login()
    resp = client.post(
        "/resume",
        headers=headers,
        files={"file": ("notes.txt", b"just some plain text", "text/plain")},
    )
    assert resp.status_code == 400


def test_upload_empty_file_rejected(client, register_and_login):
    _, headers = register_and_login()
    resp = client.post(
        "/resume",
        headers=headers,
        files={"file": ("resume.pdf", b"", "application/pdf")},
    )
    assert resp.status_code == 400


def test_upload_corrupted_pdf_rejected(client, register_and_login):
    _, headers = register_and_login()
    resp = client.post(
        "/resume",
        headers=headers,
        files={"file": ("resume.pdf", b"not a real pdf", "application/pdf")},
    )
    assert resp.status_code == 400


def test_reupload_replaces_existing_resume(client, register_and_login):
    _, headers = register_and_login()

    docx_bytes = _make_docx_bytes(SAMPLE_RESUME_LINES)
    first = client.post(
        "/resume",
        headers=headers,
        files={
            "file": (
                "v1.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    ).json()

    pdf_bytes = _make_pdf_bytes(SAMPLE_RESUME_LINES)
    second = client.post(
        "/resume",
        headers=headers,
        files={"file": ("v2.pdf", pdf_bytes, "application/pdf")},
    ).json()

    assert first["id"] == second["id"]  # same record, not a duplicate
    assert second["original_filename"] == "v2.pdf"

    # only one resume should exist for this user
    resp = client.get("/resume", headers=headers)
    assert resp.json()["original_filename"] == "v2.pdf"


def test_get_resume_after_upload(client, register_and_login):
    _, headers = register_and_login()
    docx_bytes = _make_docx_bytes(SAMPLE_RESUME_LINES)
    client.post(
        "/resume",
        headers=headers,
        files={
            "file": (
                "resume.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    resp = client.get("/resume", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["original_filename"] == "resume.docx"


def test_delete_resume(client, register_and_login):
    _, headers = register_and_login()
    docx_bytes = _make_docx_bytes(SAMPLE_RESUME_LINES)
    client.post(
        "/resume",
        headers=headers,
        files={
            "file": (
                "resume.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    resp = client.delete("/resume", headers=headers)
    assert resp.status_code == 204

    resp = client.get("/resume", headers=headers)
    assert resp.status_code == 404


def test_delete_resume_without_one_returns_404(client, register_and_login):
    _, headers = register_and_login()
    resp = client.delete("/resume", headers=headers)
    assert resp.status_code == 404


def test_resume_is_private_per_user(client, register_and_login):
    """User A's resume should never be visible via User B's GET /resume."""
    _, headers_a = register_and_login(email=email("resumeuser1"))
    _, headers_b = register_and_login(email=email("resumeuser2"))

    docx_bytes = _make_docx_bytes(SAMPLE_RESUME_LINES)
    client.post(
        "/resume",
        headers=headers_a,
        files={
            "file": (
                "a.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    resp = client.get("/resume", headers=headers_b)
    assert resp.status_code == 404  # B has no resume of their own


# ---------- ATS scoring ----------


def test_ats_score_requires_auth(client):
    resp = client.post("/resume/ats-score", json={"job_description": "Backend role"})
    assert resp.status_code == 401


def test_ats_score_without_resume_returns_404(client, register_and_login):
    _, headers = register_and_login()
    resp = client.post(
        "/resume/ats-score", json={"job_description": "Backend role"}, headers=headers
    )
    assert resp.status_code == 404


def test_ats_score_without_configured_key_returns_clean_500(client, register_and_login, monkeypatch):
    import app.services.llm_client as llm_module

    monkeypatch.setattr(llm_module.settings, "gemini_api_key", None)

    _, headers = register_and_login()
    docx_bytes = _make_docx_bytes(SAMPLE_RESUME_LINES)
    client.post(
        "/resume",
        headers=headers,
        files={
            "file": (
                "resume.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    resp = client.post(
        "/resume/ats-score", json={"job_description": "Backend role"}, headers=headers
    )
    assert resp.status_code == 500
    assert "GEMINI_API_KEY" in resp.json()["detail"]


def test_ats_score_empty_job_description_rejected(client, register_and_login):
    _, headers = register_and_login()
    resp = client.post("/resume/ats-score", json={"job_description": ""}, headers=headers)
    assert resp.status_code == 400


def test_ats_score_success_with_mocked_llm(client, register_and_login):
    _, headers = register_and_login()
    docx_bytes = _make_docx_bytes(SAMPLE_RESUME_LINES)
    client.post(
        "/resume",
        headers=headers,
        files={
            "file": (
                "resume.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )

    fake_result = {
        "match_score": 78,
        "matched_keywords": ["Python", "FastAPI"],
        "missing_keywords": ["Kubernetes"],
        "summary": "Strong backend match, missing container orchestration experience.",
    }
    with patch("app.routers.resume.score_resume_against_job", return_value=fake_result):
        resp = client.post(
            "/resume/ats-score",
            json={"job_description": "Backend role needing Python, FastAPI, Kubernetes"},
            headers=headers,
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["match_score"] == 78
    assert "Kubernetes" in body["missing_keywords"]


# ---------- bullet tailoring ----------


def test_tailor_bullets_requires_auth(client):
    resp = client.post(
        "/resume/tailor-bullets",
        json={"bullet_points": ["Built APIs"], "job_description": "Backend role"},
    )
    assert resp.status_code == 401


def test_tailor_bullets_empty_list_rejected(client, register_and_login):
    _, headers = register_and_login()
    resp = client.post(
        "/resume/tailor-bullets",
        json={"bullet_points": [], "job_description": "Backend role"},
        headers=headers,
    )
    assert resp.status_code == 400


def test_tailor_bullets_without_configured_key_returns_clean_500(
    client, register_and_login, monkeypatch
):
    import app.services.llm_client as llm_module

    monkeypatch.setattr(llm_module.settings, "gemini_api_key", None)

    _, headers = register_and_login()
    resp = client.post(
        "/resume/tailor-bullets",
        json={"bullet_points": ["Built REST APIs"], "job_description": "Backend role"},
        headers=headers,
    )
    assert resp.status_code == 500
    assert "GEMINI_API_KEY" in resp.json()["detail"]


def test_tailor_bullets_does_not_require_a_saved_resume(client, register_and_login):
    """Unlike ATS scoring, bullets are passed directly in the request, so
    this should work even for a user with no resume on file."""
    _, headers = register_and_login()

    with patch("app.routers.resume.tailor_bullet_points") as mock_tailor:
        from app.schemas import TailoredBullet

        mock_tailor.return_value = [
            TailoredBullet(
                original="Built REST APIs",
                tailored="Built and shipped RESTful APIs using FastAPI",
            )
        ]

        resp = client.post(
            "/resume/tailor-bullets",
            json={"bullet_points": ["Built REST APIs"], "job_description": "Backend role"},
            headers=headers,
        )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["results"]) == 1
    assert body["results"][0]["original"] == "Built REST APIs"