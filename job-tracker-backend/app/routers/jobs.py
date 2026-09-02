from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Job, JobStatus, Resume, RemotePreference, User, UserProfile
from app.rate_limit import limiter
from app.routers.profile import _split as _split_profile_list
from app.schemas import JobCreate, JobOut, JobSearchResponse, JobUpdate, SuggestedJobsResponse
from app.services.job_search import search_jobs
from app.services.llm_client import generate_job_search_query

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _build_profile_context(profile: UserProfile) -> str:
    """Renders a UserProfile as a short plain-text blob for the LLM prompt
    in generate_job_search_query - not a public API response shape."""
    lines = []
    if profile.desired_role:
        lines.append(f"Desired role: {profile.desired_role}")
    skills = _split_profile_list(profile.skills)
    if skills:
        lines.append(f"Skills: {', '.join(skills)}")
    if profile.experience_level:
        lines.append(f"Experience level: {profile.experience_level.value}")
    locations = _split_profile_list(profile.preferred_locations)
    if locations:
        lines.append(f"Preferred location(s): {', '.join(locations)}")
    elif profile.current_location:
        # Fall back to current_location only if no explicit job-search
        # location preference was given - preferred_locations always wins
        # when both are present, since it's an intentional job-search
        # signal rather than just "where the candidate happens to live".
        lines.append(f"Current location (no explicit preference given): {profile.current_location}")
    if profile.remote_preference:
        lines.append(f"Remote preference: {profile.remote_preference.value}")
    if profile.employment_type:
        lines.append(f"Employment type: {profile.employment_type.value}")
    return "\n".join(lines)


def _get_owned_job_or_404(job_id: int, db: Session, current_user: User) -> Job:
    """Fetch a job by id, scoped to current_user. Returns 404 (not 403) if the
    job doesn't exist OR belongs to another user, so we never reveal that a
    job id exists for someone else."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.get("", response_model=List[JobOut])
def list_jobs(
    status_filter: Optional[JobStatus] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Job).filter(Job.user_id == current_user.id)
    if status_filter is not None:
        query = query.filter(Job.status == status_filter)
    return query.order_by(Job.created_at.desc()).all()


# NOTE: this must be registered BEFORE @router.get("/{job_id}") below.
# Otherwise "/jobs/search" would be routed to get_job with job_id="search",
# which fails int parsing and returns a confusing 422 instead of ever
# reaching this handler.
@router.get("/search", response_model=JobSearchResponse)
async def search_jobs_endpoint(
    query: str = Query(..., min_length=1, description="e.g. 'backend developer in Bangalore'"),
    page: int = Query(default=1, ge=1),
    remote_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
):
    """Live search against an external job board (JSearch). Results are NOT
    saved automatically - pass a result's fields into POST /jobs to add it
    to your tracked list."""
    results = await search_jobs(query=query, page=page, remote_only=remote_only)
    return JobSearchResponse(query=query, page=page, results=results)


# NOTE: also registered BEFORE @router.get("/{job_id}") for the same reason
# as /search above - "/jobs/suggested" would otherwise be misrouted as
# job_id="suggested".
@router.get("/suggested", response_model=SuggestedJobsResponse)
@limiter.limit("10/minute")
async def suggested_jobs_endpoint(
    request: Request,
    page: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reads the user's saved resume and/or profile (self-reported job
    preferences), has Gemini generate a search query combining them - the
    resume signals what the candidate can do, the profile signals what
    they're looking for - then runs that query against the same live job
    board /jobs/search uses. Requires at least a resume or a profile to
    already be on file (404 if neither exists). A profile with a "remote"
    preference also restricts the search to remote-only listings."""
    resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    if resume is None and profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "No resume or profile on file. Upload a resume via POST "
                "/resume, or set your job preferences via PUT /profile."
            ),
        )

    resume_text = resume.extracted_text if resume else None
    profile_context = _build_profile_context(profile) if profile else None

    generated_query = generate_job_search_query(resume_text, profile_context=profile_context)
    remote_only = bool(profile and profile.remote_preference == RemotePreference.remote)
    results = await search_jobs(query=generated_query, page=page, remote_only=remote_only)
    return SuggestedJobsResponse(generated_query=generated_query, page=page, results=results)


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_job_or_404(job_id, db, current_user)


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = Job(**job_in.model_dump(), user_id=current_user.id)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.put("/{job_id}", response_model=JobOut)
def update_job(
    job_id: int,
    job_in: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = _get_owned_job_or_404(job_id, db, current_user)

    update_data = job_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = _get_owned_job_or_404(job_id, db, current_user)
    db.delete(job)
    db.commit()
    return None