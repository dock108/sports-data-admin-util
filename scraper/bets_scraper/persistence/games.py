"""Game persistence helpers."""

from __future__ import annotations

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import db_models
from ..models import NormalizedGame
from ..utils.db_queries import get_league_id
from ..utils.datetime_utils import utcnow
from .teams import _upsert_team


def upsert_game(session: Session, normalized: NormalizedGame) -> int:
    """Upsert a game, creating or updating as needed.
    
    Returns the game ID (new or existing).
    """
    league_id = get_league_id(session, normalized.identity.league_code)
    home_team_id = _upsert_team(session, league_id, normalized.identity.home_team)
    away_team_id = _upsert_team(session, league_id, normalized.identity.away_team)

    conflict_updates = {
        "home_score": normalized.home_score,
        "away_score": normalized.away_score,
        "status": normalized.status,
        "venue": normalized.venue,
        "scrape_version": db_models.SportsGame.scrape_version + 1,
        "last_scraped_at": utcnow(),
        "updated_at": utcnow(),
        # Only set source_game_key if the existing row doesn't have one; avoid clobber.
        "source_game_key": func.coalesce(db_models.SportsGame.source_game_key, normalized.identity.source_game_key),
    }

    base_stmt = insert(db_models.SportsGame).values(
        league_id=league_id,
        season=normalized.identity.season,
        season_type=normalized.identity.season_type,
        game_date=normalized.identity.game_date,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
        home_score=normalized.home_score,
        away_score=normalized.away_score,
        venue=normalized.venue,
        status=normalized.status,
        source_game_key=normalized.identity.source_game_key,
        scrape_version=1,
        last_scraped_at=utcnow(),
        external_ids={},
    )

    # Prefer identity constraint to avoid duplicate-key violations when the same game is seen
    # under a different source_game_key.
    stmt = base_stmt.on_conflict_do_update(
        constraint="uq_game_identity",
        set_=conflict_updates,
    )

    stmt = stmt.returning(db_models.SportsGame.id)
    game_id = session.execute(stmt).scalar_one()
    return int(game_id)
