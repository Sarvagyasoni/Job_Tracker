"""Extracts plain text from an uploaded resume file (PDF or DOCX).

Kept separate from the router so the extraction logic is easy to test on
its own, without needing a running server or database.
"""

import io

import docx
from fastapi import HTTPException, status
from pypdf import PdfReader

_ALLOWED_CONTENT_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}

_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB - resumes are small; this is generous
_MIN_EXTRACTED_CHARS = 20  # sanity check that we actually got real content


def _extract_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    pages_text = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages_text).strip()


def _extract_docx_text(file_bytes: bytes) -> str:
    document = docx.Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
    return "\n".join(paragraphs).strip()


def extract_resume_text(filename: str, content_type: str, file_bytes: bytes) -> str:
    """Validates and extracts text from an uploaded resume file.
    Raises HTTPException (400) for anything the caller did wrong
    (bad file type, empty file, file too large, unreadable/scanned PDF)."""

    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume must be a PDF or DOCX file.",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    if len(file_bytes) > _MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume file is too large (max 5 MB).",
        )

    file_kind = _ALLOWED_CONTENT_TYPES[content_type]

    try:
        if file_kind == "pdf":
            text = _extract_pdf_text(file_bytes)
        else:
            text = _extract_docx_text(file_bytes)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read this file. It may be corrupted or password-protected.",
        )

    if len(text) < _MIN_EXTRACTED_CHARS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Could not extract readable text from this file. "
                "If it's a scanned/image-based PDF, try a text-based export instead."
            ),
        )

    return text