"""add profile fields to users

Revision ID: a1b2c3d4e5f6
Revises: 484c0d7874e1
Create Date: 2026-09-02 14:00:00.000000

See features/profile/README.md for the contract.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '484c0d7874e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('first_name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('preferred_roles', sa.ARRAY(sa.String(length=25)), nullable=True))
    op.add_column('users', sa.Column('preferred_locations', sa.ARRAY(sa.String(length=25)), nullable=True))
    op.add_column('users', sa.Column('work_mode', sa.ARRAY(sa.String(length=20)), nullable=True))
    op.add_column('users', sa.Column('employment_type', sa.ARRAY(sa.String(length=20)), nullable=True))
    op.add_column('users', sa.Column('experience_level', sa.String(length=20), nullable=True))
    op.add_column('users', sa.Column('years_of_experience', sa.String(length=10), nullable=True))
    op.add_column('users', sa.Column('skills', sa.ARRAY(sa.String(length=50)), nullable=True))
    op.add_column('users', sa.Column('minimum_salary_amount', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('minimum_salary_currency', sa.String(length=3), nullable=True))
    op.add_column('users', sa.Column('profile_updated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'profile_updated_at')
    op.drop_column('users', 'minimum_salary_currency')
    op.drop_column('users', 'minimum_salary_amount')
    op.drop_column('users', 'skills')
    op.drop_column('users', 'years_of_experience')
    op.drop_column('users', 'experience_level')
    op.drop_column('users', 'employment_type')
    op.drop_column('users', 'work_mode')
    op.drop_column('users', 'preferred_locations')
    op.drop_column('users', 'preferred_roles')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
