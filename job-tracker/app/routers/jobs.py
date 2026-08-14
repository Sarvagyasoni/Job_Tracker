from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Job, JobStatus, User
from app.schemas import JobCreate, JobOut, JobSearchResponse, JobUpdate
from app.services.job_search import search_jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])


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
