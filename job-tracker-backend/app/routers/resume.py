from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Resume, User
from app.rate_limit import limiter
from app.schemas import (
    ATSScoreRequest,
    ATSScoreResponse,
    ResumeOut,
    TailorBulletsRequest,
    TailorBulletsResponse,
)
from app.services.llm_client import score_resume_against_job, tailor_bullet_points
from app.services.resume_parser import extract_resume_text

router = APIRouter(prefix="/resume", tags=["resume"])


def _get_own_resume_or_404(db: Session, current_user: User) -> Resume:
    resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
    if resume is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume on file. Upload one first via POST /resume.",
        )
    return resume


@router.post("", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Uploads (or replaces) the current user's resume. Only the extracted
    text is stored - not the original file."""
    file_bytes = await file.read()
    extracted_text = extract_resume_text(
        filename=file.filename or "resume",
        content_type=file.content_type or "",
        file_bytes=file_bytes,
    )

    existing = db.query(Resume).filter(Resume.user_id == current_user.id).first()
    if existing:
        existing.original_filename = file.filename or "resume"
        existing.extracted_text = extracted_text
        existing.uploaded_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    resume = Resume(
        user_id=current_user.id,
        original_filename=file.filename or "resume",
        extracted_text=extracted_text,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("", response_model=ResumeOut)
def get_resume(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_own_resume_or_404(db, current_user)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resume = _get_own_resume_or_404(db, current_user)
    db.delete(resume)
    db.commit()
    return None


@router.post("/ats-score", response_model=ATSScoreResponse)
@limiter.limit("10/minute")
def ats_score(
    request: Request,
    payload: ATSScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compares the user's saved resume against a job description, using an
    LLM to produce an ATS-style match score and keyword gap analysis."""
    resume = _get_own_resume_or_404(db, current_user)
    result = score_resume_against_job(resume.extracted_text, payload.job_description)
    return ATSScoreResponse(**result)


@router.post("/tailor-bullets", response_model=TailorBulletsResponse)
@limiter.limit("10/minute")
def tailor_bullets(
    request: Request,
    payload: TailorBulletsRequest,
    current_user: User = Depends(get_current_user),
):
    """Rewrites the given resume bullet points to highlight skills relevant
    to the given job description. Does not require a saved resume - bullets
    are passed directly in the request, so this also works for someone
    drafting new bullets from scratch."""
    results = tailor_bullet_points(payload.bullet_points, payload.job_description)
    return TailorBulletsResponse(results=results)