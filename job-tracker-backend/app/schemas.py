from datetime import date, datetime
from typing import List, Optional

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


# ---------- User profile & job preferences ----------

class SalaryExpectation(BaseModel):
    amount: int
    currency: str  # ISO 4217, e.g. "USD", "INR"

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Salary amount must be positive")
        return v

    @field_validator("currency")
    @classmethod
    def currency_format(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) != 3 or not v.isalpha():
            raise ValueError("Currency must be a 3-letter ISO 4217 code (e.g. USD, INR)")
        return v


class UserProfile(BaseModel):
    """Full user profile + job preferences. Returned by GET /users/me/profile."""

    first_name: str
    last_name: str
    preferred_roles: List[str]
    preferred_locations: List[str]
    work_mode: List[str] = []
    employment_type: List[str] = []
    experience_level: Optional[str] = None
    years_of_experience: Optional[str] = None
    skills: List[str] = []
    minimum_salary: Optional[SalaryExpectation] = None
    is_complete: bool
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    """Partial-update payload for PUT /users/me/profile. All fields optional
    so the frontend can PATCH any subset."""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    preferred_roles: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    work_mode: Optional[List[str]] = None
    employment_type: Optional[List[str]] = None
    experience_level: Optional[str] = None
    years_of_experience: Optional[str] = None
    skills: Optional[List[str]] = None
    minimum_salary: Optional[SalaryExpectation] = None

    _ALLOWED_WORK_MODES = {"remote", "hybrid", "on_site", "any"}
    _ALLOWED_EMPLOYMENT_TYPES = {
        "full_time", "part_time", "contract", "internship", "freelance", "any",
    }
    _ALLOWED_EXPERIENCE_LEVELS = {
        "internship", "entry_level", "junior", "mid", "senior", "lead", "any",
    }
    _ALLOWED_YEARS = {"0", "1-2", "3-5", "6-10", "10+", "any"}

    @field_validator("first_name", "last_name")
    @classmethod
    def name_trim_and_nonempty(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        if len(v) > 100:
            raise ValueError("Name must be 100 characters or fewer")
        return v

    @field_validator("preferred_roles", "preferred_locations")
    @classmethod
    def required_array_with_limits(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        if len(v) < 1:
            raise ValueError("At least one entry is required")
        if len(v) > 10:
            raise ValueError("Maximum 10 entries allowed")
        cleaned = [item.strip() for item in v if item and item.strip()]
        if len(cleaned) < 1:
            raise ValueError("Entries cannot be empty")
        if any(len(item) > 25 for item in cleaned):
            raise ValueError("Each entry must be 25 characters or fewer")
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("Duplicate entries are not allowed")
        return cleaned

    @field_validator("work_mode", "employment_type")
    @classmethod
    def optional_enum_array(cls, v: Optional[List[str]], info) -> Optional[List[str]]:
        if v is None:
            return None
        allowed = (
            cls._ALLOWED_WORK_MODES
            if info.field_name == "work_mode"
            else cls._ALLOWED_EMPLOYMENT_TYPES
        )
        for item in v:
            if item not in allowed:
                raise ValueError(f"Invalid {info.field_name} value: {item}")
        if len(set(v)) != len(v):
            raise ValueError(f"Duplicate {info.field_name} values are not allowed")
        return v

    @field_validator("experience_level")
    @classmethod
    def experience_level_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in cls._ALLOWED_EXPERIENCE_LEVELS:
            raise ValueError(f"Invalid experience level: {v}")
        return v

    @field_validator("years_of_experience")
    @classmethod
    def years_of_experience_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in cls._ALLOWED_YEARS:
            raise ValueError(f"Invalid years of experience: {v}")
        return v

    @field_validator("skills")
    @classmethod
    def skills_with_limits(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        if len(v) > 30:
            raise ValueError("Maximum 30 skills allowed")
        cleaned = [item.strip() for item in v if item and item.strip()]
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("Duplicate skills are not allowed")
        if any(len(item) > 50 for item in cleaned):
            raise ValueError("Each skill must be 50 characters or fewer")
        return cleaned


def compute_is_complete(profile_attrs: dict) -> bool:
    """Server-side derivation of the is_complete flag, used after every write.

    True iff all four required fields are populated:
    - first_name (non-empty after strip)
    - last_name (non-empty after strip)
    - preferred_roles (>= 1 item)
    - preferred_locations (>= 1 item)
    """
    return bool(
        (profile_attrs.get("first_name") or "").strip()
        and (profile_attrs.get("last_name") or "").strip()
        and len(profile_attrs.get("preferred_roles") or []) >= 1
        and len(profile_attrs.get("preferred_locations") or []) >= 1
    )


def profile_to_response(user) -> dict:
    """Build the UserProfile response payload from a User ORM instance."""
    return {
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "preferred_roles": user.preferred_roles or [],
        "preferred_locations": user.preferred_locations or [],
        "work_mode": user.work_mode or [],
        "employment_type": user.employment_type or [],
        "experience_level": user.experience_level,
        "years_of_experience": user.years_of_experience,
        "skills": user.skills or [],
        "minimum_salary": (
            {"amount": user.minimum_salary_amount, "currency": user.minimum_salary_currency}
            if user.minimum_salary_amount is not None and user.minimum_salary_currency
            else None
        ),
        "is_complete": compute_is_complete(
            {
                "first_name": user.first_name,
                "last_name": user.last_name,
                "preferred_roles": user.preferred_roles,
                "preferred_locations": user.preferred_locations,
            }
        ),
        "updated_at": user.profile_updated_at,
    }