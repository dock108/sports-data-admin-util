"""Initial schema baseline."""

from __future__ import annotations

from alembic import op

# revision identifiers, used by Alembic.
revision = "20250920_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Baseline migration (schema managed via SQLAlchemy models)."""


def downgrade() -> None:
    """No-op downgrade for baseline."""
