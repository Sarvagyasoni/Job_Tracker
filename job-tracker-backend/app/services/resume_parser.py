"""Extracts plain text from an uploaded resume file (PDF or DOCX).

Kept separate from the router so the extraction logic is easy to test on
its own, without needing a running server or database.
"""

import io

import docx
from fastapi import HTTPException, status
from pypdf import PdfReader

_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB - resumes are small; this is generous
_MIN_EXTRACTED_CHARS = 20  # sanity check that we actually got real content

# Magic bytes: the first few bytes of a file reveal its real format,
# regardless of what a client claims via filename or Content-Type header.
# The client-supplied Content-Type header is deliberately NOT used for
# validation here - it's unreliable. Many API clients (including Postman,
# depending on the OS's file-type associations) send a generic
# "application/octet-stream" Content-Type even for a perfectly valid PDF,
# which would incorrectly reject real files if we trusted that header.
# PDFs start with "%PDF"; DOCX files are ZIP archives, which always start
# with the same 4-byte signature.
_PDF_MAGIC = b"%PDF"
_DOCX_MAGIC = b"PK\x03\x04"


def _extract_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    pages_text = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages_text).strip()


def _extract_docx_text(file_bytes: bytes) -> str:
    document = docx.Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
    return "\n".join(paragraphs).strip()


def _detect_file_kind(filename: str) -> str:
    """Determines PDF vs DOCX from the filename extension. Raises 400 for
    anything else, before we even look at the file's bytes."""
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return "pdf"
    if name.endswith(".docx"):
        return "docx"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Resume must be a PDF or DOCX file.",
    )


def _verify_magic_bytes(file_kind: str, file_bytes: bytes) -> None:
    """Cross-checks the extension-based guess against the file's actual
    bytes, so a file renamed to fake a .pdf/.docx extension is still
    caught."""
    if file_kind == "pdf" and not file_bytes.startswith(_PDF_MAGIC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This file has a .pdf extension but doesn't look like a real PDF.",
        )
    if file_kind == "docx" and not file_bytes.startswith(_DOCX_MAGIC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This file has a .docx extension but doesn't look like a real DOCX.",
        )


def extract_resume_text(filename: str, content_type: str, file_bytes: bytes) -> str:
    """Validates and extracts text from an uploaded resume file.
    Raises HTTPException (400) for anything the caller did wrong
    (bad file type, empty file, file too large, unreadable/scanned PDF).

    content_type is accepted for call-site compatibility but intentionally
    unused for validation - see the module docstring above for why.
    """

    file_kind = _detect_file_kind(filename)

    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    if len(file_bytes) > _MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume file is too large (max 5 MB).",
        )

    _verify_magic_bytes(file_kind, file_bytes)

    try:
        if file_kind == "pdf":
            text = _extract_pdf_text(file_bytes)
        else:
            text = _extract_docx_text(file_bytes)
    except HTTPException:
        raise
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