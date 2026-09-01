import io
from unittest.mock import patch

import docx
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from pypdf import PdfReader

from app.schemas import EnhancedResumeContent, ResumeSection
from app.services.resume_pdf import render_resume_pdf

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


FAKE_ENHANCED_CONTENT = EnhancedResumeContent(
    sections=[
        ResumeSection(
            heading="Summary",
            paragraph="Backend engineer experienced in Python, FastAPI, and PostgreSQL.",
        ),
        ResumeSection(
            heading="Experience",
            bullet_points=[
                "Built and shipped REST APIs using FastAPI and PostgreSQL.",
                "Wrote Alembic migrations for schema changes across a multi-tenant platform.",
            ],
        ),
    ]
)


# ---------- endpoint tests ----------


def test_enhance_resume_requires_auth(client):
    resp = client.post("/resume/enhance", json={"job_description": "Backend role"})
    assert resp.status_code == 401


def test_enhance_resume_without_resume_returns_404(client, register_and_login):
    _, headers = register_and_login()
    resp = client.post(
        "/resume/enhance", json={"job_description": "Backend role"}, headers=headers
    )
    assert resp.status_code == 404


def test_enhance_resume_blank_job_description_rejected(client, register_and_login):
    _, headers = register_and_login()
    _upload_sample_resume(client, headers)

    resp = client.post("/resume/enhance", json={"job_description": "   "}, headers=headers)
    assert resp.status_code == 400


def test_enhance_resume_without_configured_key_returns_clean_500(
    client, register_and_login, monkeypatch
):
    import app.services.llm_client as llm_module

    monkeypatch.setattr(llm_module.settings, "gemini_api_key", None)

    _, headers = register_and_login()
    _upload_sample_resume(client, headers)

    resp = client.post(
        "/resume/enhance", json={"job_description": "Backend role"}, headers=headers
    )
    assert resp.status_code == 500
    assert "GEMINI_API_KEY" in resp.json()["detail"]


def test_enhance_resume_success_returns_real_pdf(client, register_and_login):
    _, headers = register_and_login()
    _upload_sample_resume(client, headers)

    with patch(
        "app.routers.resume.generate_enhanced_resume_content"
    ) as mock_generate:
        mock_generate.return_value = FAKE_ENHANCED_CONTENT

        resp = client.post(
            "/resume/enhance",
            json={"job_description": "Backend role requiring FastAPI and PostgreSQL"},
            headers=headers,
        )

    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "application/pdf"
    assert "attachment" in resp.headers["content-disposition"]
    assert "enhanced_resume.pdf" in resp.headers["content-disposition"]

    # The body should be a genuine, valid PDF - not just a 200 with junk bytes
    pdf_bytes = resp.content
    assert pdf_bytes.startswith(b"%PDF")
    reader = PdfReader(io.BytesIO(pdf_bytes))
    extracted = reader.pages[0].extract_text()
    assert "Summary" in extracted
    assert "FastAPI" in extracted

    # Confirm the saved resume's actual text was passed through
    call_args = mock_generate.call_args[0]
    assert "Backend Software Engineer" in call_args[0] or "Jane Doe" in call_args[0]
    assert call_args[1] == "Backend role requiring FastAPI and PostgreSQL"


def test_enhance_resume_cannot_use_another_users_resume(client, register_and_login):
    _, headers1 = register_and_login(email=email("enhanceowner"))
    _, headers2 = register_and_login(email=email("enhanceother"))

    _upload_sample_resume(client, headers1)

    resp = client.post(
        "/resume/enhance", json={"job_description": "Backend role"}, headers=headers2
    )
    assert resp.status_code == 404


# ---------- PDF rendering unit tests (no auth/server/API key needed) ----------


def test_render_resume_pdf_produces_valid_pdf():
    pdf_bytes = render_resume_pdf(FAKE_ENHANCED_CONTENT.sections)
    assert pdf_bytes.startswith(b"%PDF")

    reader = PdfReader(io.BytesIO(pdf_bytes))
    extracted = reader.pages[0].extract_text()
    assert "Summary" in extracted
    assert "Experience" in extracted
    assert "FastAPI" in extracted


def test_render_resume_pdf_escapes_special_characters():
    """Regression test: reportlab's Paragraph parses text as a small XML
    dialect. Unescaped '&', '<', '>' (very plausible in LLM-generated text,
    e.g. 'improved throughput by >20%') can corrupt or silently drop
    content if not escaped first."""
    tricky_section = ResumeSection(
        heading="Experience",
        paragraph="Worked with R&D and improved throughput by >20% while keeping latency <100ms.",
        bullet_points=["Reduced error rates by >15% using automated testing & monitoring."],
    )

    pdf_bytes = render_resume_pdf([tricky_section])
    reader = PdfReader(io.BytesIO(pdf_bytes))
    extracted = reader.pages[0].extract_text()

    assert "R&D" in extracted
    assert "20%" in extracted
    assert "100ms" in extracted
    assert "15%" in extracted


def test_render_resume_pdf_handles_section_with_only_paragraph():
    section = ResumeSection(heading="Summary", paragraph="A short professional summary.")
    pdf_bytes = render_resume_pdf([section])
    assert pdf_bytes.startswith(b"%PDF")


def test_render_resume_pdf_handles_section_with_only_bullets():
    section = ResumeSection(heading="Skills", bullet_points=["Python", "FastAPI", "PostgreSQL"])
    pdf_bytes = render_resume_pdf([section])
    assert pdf_bytes.startswith(b"%PDF")


def test_render_resume_pdf_handles_multiple_sections():
    pdf_bytes = render_resume_pdf(FAKE_ENHANCED_CONTENT.sections)
    assert pdf_bytes.startswith(b"%PDF")
    reader = PdfReader(io.BytesIO(pdf_bytes))
    assert len(reader.pages) >= 1