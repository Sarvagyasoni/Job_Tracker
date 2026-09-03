"""Routes for the user profile & job preferences feature.

See features/profile/README.md for the full contract.

Endpoints:
- GET  /users/me/profile  -> 200 with UserProfile, or 404 if never created
- PUT  /users/me/profile  -> 200 with updated UserProfile (upsert)
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas import UserProfile, UserProfileUpdate, profile_to_response

router = APIRouter(prefix="/users/me", tags=["profile"])


@router.get("/profile", response_model=UserProfile)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current user's profile. 404 if it has never been created
    (i.e. a brand-new user who hasn't completed onboarding yet)."""
    if not current_user.profile_updated_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile on file. Complete your profile via PUT /users/me/profile.",
        )
    return profile_to_response(current_user)


@router.put("/profile", response_model=UserProfile)
def upsert_my_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update the current user's profile. Partial update - any
    field omitted from the request is left unchanged. Always returns 200
    with the full updated profile."""
    update_data = payload.model_dump(exclude_unset=True)

    if "minimum_salary" in update_data:
        ms = update_data.pop("minimum_salary")
        if ms is None:
            update_data["minimum_salary_amount"] = None
            update_data["minimum_salary_currency"] = None
        else:
            update_data["minimum_salary_amount"] = ms["amount"]
            update_data["minimum_salary_currency"] = ms["currency"]

    for field, value in update_data.items():
        setattr(current_user, field, value)

    current_user.profile_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)

    return profile_to_response(current_user)
