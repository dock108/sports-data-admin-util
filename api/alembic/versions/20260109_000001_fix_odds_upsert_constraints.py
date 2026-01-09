"""Fix odds upsert constraints (side length + unique index).

Revision ID: 20260109_000001
Revises: 20260120_000001
Create Date: 2026-01-09

Why:
- Scraper upsert uses ON CONFLICT(game_id, book, market_type, side, is_closing_line)
  but the DB had a UNIQUE index missing `side`, causing InvalidColumnReference.
- `side` was VARCHAR(20), too small for team names (e.g. "Golden State Warriors").
"""

from alembic import op
import sqlalchemy as sa


revision = "20260109_000001"
down_revision = "20260120_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) Widen side so it can store team names / "Over" / "Under" safely.
    op.alter_column(
        "sports_game_odds",
        "side",
        existing_type=sa.String(length=20),
        type_=sa.String(length=100),
        existing_nullable=True,
    )

    # 2) Align unique index with upsert ON CONFLICT target.
    # Existing index name is uq_sports_game_odds_identity, but it currently omits `side`.
    op.drop_index("uq_sports_game_odds_identity", table_name="sports_game_odds")
    op.create_index(
        "uq_sports_game_odds_identity",
        "sports_game_odds",
        ["game_id", "book", "market_type", "side", "is_closing_line"],
        unique=True,
    )


def downgrade() -> None:
    # Revert unique index (drop side from uniqueness) and shrink side length.
    op.drop_index("uq_sports_game_odds_identity", table_name="sports_game_odds")
    op.create_index(
        "uq_sports_game_odds_identity",
        "sports_game_odds",
        ["game_id", "book", "market_type", "is_closing_line"],
        unique=True,
    )
    op.alter_column(
        "sports_game_odds",
        "side",
        existing_type=sa.String(length=100),
        type_=sa.String(length=20),
        existing_nullable=True,
    )

