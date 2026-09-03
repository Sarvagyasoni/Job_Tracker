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
    ARRAY,
)
from sqlalchemy.orm import relationship

from app.database import Base


class JobStatus(str, enum.Enum):
    applied = "applied"
    interviewing = "interviewing"
    offer = "offer"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # --- Profile & job preferences (added 2026-09-02, see
    # features/profile/README.md) ---
    # All nullable so existing users can still log in without a profile.
    # Application-layer validation enforces non-empty for required fields.
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    preferred_roles = Column(ARRAY(String(25)), nullable=True)
    preferred_locations = Column(ARRAY(String(25)), nullable=True)
    work_mode = Column(ARRAY(String(20)), nullable=True)
    employment_type = Column(ARRAY(String(20)), nullable=True)
    experience_level = Column(String(20), nullable=True)
    years_of_experience = Column(String(10), nullable=True)
    skills = Column(ARRAY(String(50)), nullable=True)
    minimum_salary_amount = Column(Integer, nullable=True)
    minimum_salary_currency = Column(String(3), nullable=True)
    profile_updated_at = Column(DateTime, nullable=True)

    jobs = relationship("Job", back_populates="owner", cascade="all, delete-orphan")
    resume = relationship(
        "Resume", back_populates="owner", cascade="all, delete-orphan", uselist=False
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