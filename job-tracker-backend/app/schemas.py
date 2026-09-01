from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict, field_validator

from app.models import JobStatus


# ---------- Auth ----------

class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Jobs ----------

class JobBase(BaseModel):
    company: str
    role: Optional[str] = None
    status: JobStatus = JobStatus.applied
    date_applied: Optional[date] = None
    link: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("company")
    @classmethod
    def company_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("company is required")
        return v.strip()

    @field_validator("link")
    @classmethod
    def link_looks_like_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("link must be a valid URL starting with http:// or https://")
        return v


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    """All fields optional so PUT can update any subset, including just status
    (used for drag-and-drop status changes)."""

    company: Optional[str] = None
    role: Optional[str] = None
    status: Optional[JobStatus] = None
    date_applied: Optional[date] = None
    link: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("company")
    @classmethod
    def company_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("company cannot be blank")
        return v.strip() if v is not None else v

    @field_validator("link")
    @classmethod
    def link_looks_like_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("link must be a valid URL starting with http:// or https://")
        return v


class JobOut(JobBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Job search (JSearch API passthrough) ----------

class JobSearchResult(BaseModel):
    """A single external listing, reshaped to match the fields JobCreate
    expects, so the frontend can pass this straight into POST /jobs with
    minimal remapping."""

    company: str
    role: str
    link: Optional[str] = None
    notes: Optional[str] = None  # short description snippet
    location: Optional[str] = None
    posted_at: Optional[str] = None
    source: str = "jsearch"


class JobSearchResponse(BaseModel):
    query: str
    page: int
    results: list[JobSearchResult]


class SuggestedJobsResponse(BaseModel):
    generated_query: str
    page: int
    results: list[JobSearchResult]


# ---------- Resume ----------

class ResumeOut(BaseModel):
    id: int
    original_filename: str
    uploaded_at: datetime
    # Deliberately omits extracted_text - it can be long, and the caller
    # generally only needs confirmation a resume exists plus its metadata,
    # not the full text echoed back.

    model_config = ConfigDict(from_attributes=True)


# ---------- ATS compatibility scoring ----------

class ATSScoreRequest(BaseModel):
    job_description: str

    @field_validator("job_description")
    @classmethod
    def job_description_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("job_description is required")
        return v.strip()


class ATSScoreResponse(BaseModel):
    match_score: int  # 0-100
    matched_keywords: list[str]
    missing_keywords: list[str]
    summary: str


# ---------- Resume bullet tailoring ----------

class TailorBulletsRequest(BaseModel):
    job_description: str

    @field_validator("job_description")
    @classmethod
    def job_description_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("job_description is required")
        return v.strip()


class TailorBulletsResponse(BaseModel):
    bullets: list[str]


# ---------- Enhanced resume (PDF generation) ----------

class EnhanceResumeRequest(BaseModel):
    job_description: str

    @field_validator("job_description")
    @classmethod
    def job_description_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("job_description is required")
        return v.strip()


class ResumeSection(BaseModel):
    """One section of the enhanced resume content Gemini generates - not a
    public API response on its own; used internally to build the final PDF.
    A section can have a prose paragraph (e.g. a Summary), a bulleted list
    (e.g. Experience), or both."""

    heading: str
    paragraph: Optional[str] = None
    bullet_points: list[str] = []


class EnhancedResumeContent(BaseModel):
    sections: list[ResumeSection]