import enum
from datetime import datetime, date

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    ForeignKey,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from app.database import Base


class JobStatus(str, enum.Enum):
    applied = "applied"
    interviewing = "interviewing"
    offer = "offer"
    rejected = "rejected"


class ExperienceLevel(str, enum.Enum):
    entry = "entry"
    mid = "mid"
    senior = "senior"
    lead = "lead"


class RemotePreference(str, enum.Enum):
    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"
    any = "any"


class EmploymentType(str, enum.Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"
    internship = "internship"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    jobs = relationship("Job", back_populates="owner", cascade="all, delete-orphan")
    resume = relationship(
        "Resume", back_populates="owner", cascade="all, delete-orphan", uselist=False
    )
    profile = relationship(
        "UserProfile", back_populates="owner", cascade="all, delete-orphan", uselist=False
    )


class Resume(Base):
    """One resume per user. Stores only the extracted plain text (not the
    raw file bytes) - that's all the ATS scoring and bullet-tailoring
    features actually need, and it avoids the added complexity of file
    storage. Uploading a new resume replaces the existing one."""

    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )

    original_filename = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=False)

    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="resume")


class UserProfile(Base):
    """One profile per user: basic identity info plus self-reported job
    preferences (as opposed to Resume, which stores parsed content from an
    uploaded file). Feeds GET /jobs/suggested alongside the resume - the
    resume signals *what the candidate can do*, the profile signals *who
    they are and what they're looking for*.
    skills and preferred_locations are stored as comma-separated text
    (consistent with how Resume keeps things simple by storing plain text
    rather than a richer structure) and are split/joined into lists at the
    API boundary in app/routers/profile.py.
    """

    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )

    # Basic identity info
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    # Where the candidate currently is - distinct from preferred_locations
    # below, which is where they'd be willing to WORK (may differ, e.g.
    # someone based in Mumbai open to relocating to Bangalore/Remote).
    current_location = Column(String, nullable=True)

    desired_role = Column(String, nullable=True)
    skills = Column(Text, nullable=True)
    experience_level = Column(SAEnum(ExperienceLevel, name="experience_level"), nullable=True)
    preferred_locations = Column(Text, nullable=True)
    remote_preference = Column(SAEnum(RemotePreference, name="remote_preference"), nullable=True)
    employment_type = Column(SAEnum(EmploymentType, name="employment_type"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="profile")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    company = Column(String, nullable=False)
    role = Column(String, nullable=True)
    status = Column(SAEnum(JobStatus, name="job_status"), nullable=False, default=JobStatus.applied, index=True)
    date_applied = Column(Date, nullable=True, default=date.today)
    link = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="jobs")