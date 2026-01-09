"""Beta Phase 3 - Spoiler reason metadata.

Revision ID: 20260115_000002
Revises: 20260115_000001
Create Date: 2026-01-15

This migration adds spoiler_reason to game_social_posts for debug visibility.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260115_000002"
down_revision = "20260115_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "game_social_posts",
        sa.Column("spoiler_reason", sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("game_social_posts", "spoiler_reason")
