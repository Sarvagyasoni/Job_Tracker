from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, UserProfile
from app.schemas import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


def _split(text: str | None) -> list[str]:
    if not text:
        return []
    return [part.strip() for part in text.split(",") if part.strip()]


def _join(items: list[str] | None) -> str | None:
    if not items:
        return None
    return ", ".join(items)


def _to_out(profile: UserProfile) -> ProfileOut:
    return ProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        full_name=profile.full_name,
        phone=profile.phone,
        current_location=profile.current_location,
        desired_role=profile.desired_role,
        skills=_split(profile.skills),
        experience_level=profile.experience_level,
        preferred_locations=_split(profile.preferred_locations),
        remote_preference=profile.remote_preference,
        employment_type=profile.employment_type,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def _get_own_profile_or_404(db: Session, current_user: User) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile on file. Set one first via PUT /profile.",
        )
    return profile


@router.get("", response_model=ProfileOut)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = _get_own_profile_or_404(db, current_user)
    return _to_out(profile)


@router.put("", response_model=ProfileOut)
def upsert_profile(
    profile_in: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates the current user's profile if none exists yet, or updates
    just the provided fields on the existing one (unset fields are left
    untouched, mirroring PUT /jobs/{job_id})."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    update_data = profile_in.model_dump(exclude_unset=True)

    if profile is None:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    for field, value in update_data.items():
        if field in ("skills", "preferred_locations"):
            setattr(profile, field, _join(value))
        else:
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return _to_out(profile)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = _get_own_profile_or_404(db, current_user)
    db.delete(profile)
    db.commit()
    return None