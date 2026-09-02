"""add basic identity fields to user_profiles

Revision ID: 4619c05b1970
Revises: 611c32a6b0ff
Create Date: 2026-09-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4619c05b1970'
down_revision: Union[str, None] = '611c32a6b0ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user_profiles', sa.Column('full_name', sa.String(), nullable=True))
    op.add_column('user_profiles', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('user_profiles', sa.Column('current_location', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('user_profiles', 'current_location')
    op.drop_column('user_profiles', 'phone')
    op.drop_column('user_profiles', 'full_name')