"""Odds persistence helpers.

Handles odds matching to games and persistence, including NCAAB-specific name matching.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from collections import OrderedDict

from sqlalchemy import alias, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from ..db import db_models
from ..logging import logger
from ..models import NormalizedOddsSnapshot
from ..normalization import normalize_team_name
from ..utils.db_queries import get_league_id
from ..utils.datetime_utils import utcnow
from .teams import (
    _NCAAB_STOPWORDS,
    _find_team_by_name,
    _normalize_ncaab_name_for_matching,
    _upsert_team,
)

# Odds API team name -> DB team name mappings for NCAAB
# Keeps this list tiny—only unavoidable canonical differences.
_ODDS_API_TO_DB_MAPPINGS: dict[str, str] = {
    "St. John's Red Storm": "St. John's (NY)",
    "St John's Red Storm": "St. John's (NY)",
    "St Johns Red Storm": "St. John's (NY)",
}

# Simple LRU cache to avoid repeating heavy match queries/logs for the same game+date.
_MATCH_CACHE: "OrderedDict[tuple, int | None]" = OrderedDict()
_MATCH_CACHE_MAX = 512


def _cache_get(key: tuple) -> int | None | bool:
    if key in _MATCH_CACHE:
        _MATCH_CACHE.move_to_end(key)
        return _MATCH_CACHE[key]
    return False


def _cache_set(key: tuple, value: int | None) -> None:
    _MATCH_CACHE[key] = value
    _MATCH_CACHE.move_to_end(key)
    if len(_MATCH_CACHE) > _MATCH_CACHE_MAX:
        _MATCH_CACHE.popitem(last=False)

# Simple counters to only log a subset of noisy events
_LOG_COUNTERS: dict[str, int] = {}
_LOG_SAMPLE = 50  # log every Nth occurrence per event key


def _should_log(event_key: str, sample: int = _LOG_SAMPLE) -> bool:
    count = _LOG_COUNTERS.get(event_key, 0) + 1
    _LOG_COUNTERS[event_key] = count
    return count % sample == 1  # log first and then every Nth


def _match_game_by_team_ids(
    session: Session,
    league_id: int,
    home_team_id: int,
    away_team_id: int,
    day_start: datetime,
    day_end: datetime,
) -> int | None:
    """Try to match a game by team IDs (exact and swapped)."""
    stmt = (
        select(db_models.SportsGame.id)
        .where(db_models.SportsGame.league_id == league_id)
        .where(db_models.SportsGame.home_team_id == home_team_id)
        .where(db_models.SportsGame.away_team_id == away_team_id)
        .where(db_models.SportsGame.game_date >= day_start)
        .where(db_models.SportsGame.game_date <= day_end)
    )
    game_id = session.execute(stmt).scalar()
    
    if game_id is None:
        swap_stmt = (
            select(db_models.SportsGame.id)
            .where(db_models.SportsGame.league_id == league_id)
            .where(db_models.SportsGame.home_team_id == away_team_id)
            .where(db_models.SportsGame.away_team_id == home_team_id)
            .where(db_models.SportsGame.game_date >= day_start)
            .where(db_models.SportsGame.game_date <= day_end)
        )
        game_id = session.execute(swap_stmt).scalar()
    
    return game_id


def _match_game_by_names_ncaab(
    session: Session,
    league_id: int,
    snapshot: NormalizedOddsSnapshot,
    home_canonical: str,
    away_canonical: str,
    day_start: datetime,
    day_end: datetime,
) -> int | None:
    """Match game by normalized names for NCAAB (handles name variations)."""
    # Apply API->DB name mappings if available
    home_api_name = _ODDS_API_TO_DB_MAPPINGS.get(snapshot.home_team.name, snapshot.home_team.name)
    away_api_name = _ODDS_API_TO_DB_MAPPINGS.get(snapshot.away_team.name, snapshot.away_team.name)
    
    home_normalized = _normalize_ncaab_name_for_matching(home_api_name)
    away_normalized = _normalize_ncaab_name_for_matching(away_api_name)
    home_canonical_norm = _normalize_ncaab_name_for_matching(home_canonical)
    away_canonical_norm = _normalize_ncaab_name_for_matching(away_canonical)

    def _tokens(s: str) -> set[str]:
        return {t for t in s.split(" ") if t and t not in _NCAAB_STOPWORDS}
    
    all_games_in_range = (
        select(
            db_models.SportsGame.id,
            db_models.SportsGame.home_team_id,
            db_models.SportsGame.away_team_id,
        )
        .where(db_models.SportsGame.league_id == league_id)
        .where(db_models.SportsGame.game_date >= day_start)
        .where(db_models.SportsGame.game_date <= day_end)
    )
    games_in_range = session.execute(all_games_in_range).all()
    
    team_ids = set()
    for g in games_in_range:
        team_ids.add(g[1])
        team_ids.add(g[2])
    
    if not team_ids:
        return None
    
    teams_stmt = select(db_models.SportsTeam.id, db_models.SportsTeam.name).where(
        db_models.SportsTeam.id.in_(team_ids)
    )
    teams_map = {row[0]: row[1] for row in session.execute(teams_stmt).all()}
    
    for game_id_candidate, home_id, away_id in games_in_range:
        home_db_name = teams_map.get(home_id, "")
        away_db_name = teams_map.get(away_id, "")
        home_db_norm = _normalize_ncaab_name_for_matching(home_db_name)
        away_db_norm = _normalize_ncaab_name_for_matching(away_db_name)
        home_db_tokens = _tokens(home_db_norm)
        away_db_tokens = _tokens(away_db_norm)
        home_tokens = _tokens(home_normalized)
        away_tokens = _tokens(away_normalized)
        
        home_matches = (
            home_db_norm == home_normalized or
            home_db_norm == home_canonical_norm or
            home_normalized in home_db_norm or
            home_db_norm in home_normalized
        )
        away_matches = (
            away_db_norm == away_normalized or
            away_db_norm == away_canonical_norm or
            away_normalized in away_db_norm or
            away_db_norm in away_normalized
        )
        # Token-overlap fallback (helps for cases like "Wisconsin Green Bay" vs "Green Bay Phoenix")
        if not home_matches:
            overlap_home = len(home_tokens & home_db_tokens)
            threshold_home = 1 if min(len(home_tokens), len(home_db_tokens)) <= 2 else 2
            home_matches = (
                overlap_home >= threshold_home
                or home_tokens.issubset(home_db_tokens)
                or home_db_tokens.issubset(home_tokens)
            )
        if not away_matches:
            overlap_away = len(away_tokens & away_db_tokens)
            threshold_away = 1 if min(len(away_tokens), len(away_db_tokens)) <= 2 else 2
            away_matches = (
                overlap_away >= threshold_away
                or away_tokens.issubset(away_db_tokens)
                or away_db_tokens.issubset(away_tokens)
            )
        
        if home_matches and away_matches:
            logger.info(
                "odds_game_matched_by_normalized_name",
                league=snapshot.league_code,
                home_team_name=snapshot.home_team.name,
                home_team_normalized=home_normalized,
                home_db_name=home_db_name,
                home_db_normalized=home_db_norm,
                away_team_name=snapshot.away_team.name,
                away_team_normalized=away_normalized,
                away_db_name=away_db_name,
                away_db_normalized=away_db_norm,
                matched_game_id=game_id_candidate,
                game_date=str(snapshot.game_date.date()),
            )
            return game_id_candidate
        
        home_matches_swapped = (
            home_db_norm == away_normalized or
            home_db_norm == away_canonical_norm or
            away_normalized in home_db_norm or
            home_db_norm in away_normalized
        )
        away_matches_swapped = (
            away_db_norm == home_normalized or
            away_db_norm == home_canonical_norm or
            home_normalized in away_db_norm or
            away_db_norm in home_normalized
        )
        
        if home_matches_swapped and away_matches_swapped:
            logger.info(
                "odds_game_matched_by_normalized_name_swapped",
                league=snapshot.league_code,
                requested_home=snapshot.home_team.name,
                requested_away=snapshot.away_team.name,
                matched_as_home=away_db_name,
                matched_as_away=home_db_name,
                matched_game_id=game_id_candidate,
                game_date=str(snapshot.game_date.date()),
            )
            return game_id_candidate
    
    return None


def _match_game_by_names_non_ncaab(
    session: Session,
    league_id: int,
    snapshot: NormalizedOddsSnapshot,
    home_canonical: str,
    away_canonical: str,
    day_start: datetime,
    day_end: datetime,
) -> int | None:
    """Match game by exact names for non-NCAAB leagues."""
    home_team_alias = alias(db_models.SportsTeam)
    away_team_alias = alias(db_models.SportsTeam)
    
    name_match_stmt = (
        select(db_models.SportsGame.id)
        .join(home_team_alias, db_models.SportsGame.home_team_id == home_team_alias.c.id)
        .join(away_team_alias, db_models.SportsGame.away_team_id == away_team_alias.c.id)
        .where(db_models.SportsGame.league_id == league_id)
        .where(
            or_(
                func.lower(home_team_alias.c.name) == func.lower(home_canonical),
                func.lower(home_team_alias.c.name) == func.lower(snapshot.home_team.name),
            )
        )
        .where(
            or_(
                func.lower(away_team_alias.c.name) == func.lower(away_canonical),
                func.lower(away_team_alias.c.name) == func.lower(snapshot.away_team.name),
            )
        )
        .where(db_models.SportsGame.game_date >= day_start)
        .where(db_models.SportsGame.game_date <= day_end)
    )
    name_match_id = session.execute(name_match_stmt).scalar()
    
    if name_match_id is None:
        swapped_name_match_stmt = (
            select(db_models.SportsGame.id)
            .join(home_team_alias, db_models.SportsGame.home_team_id == home_team_alias.c.id)
            .join(away_team_alias, db_models.SportsGame.away_team_id == away_team_alias.c.id)
            .where(db_models.SportsGame.league_id == league_id)
            .where(
                or_(
                    func.lower(home_team_alias.c.name) == func.lower(away_canonical),
                    func.lower(home_team_alias.c.name) == func.lower(snapshot.away_team.name),
                )
            )
            .where(
                or_(
                    func.lower(away_team_alias.c.name) == func.lower(home_canonical),
                    func.lower(away_team_alias.c.name) == func.lower(snapshot.home_team.name),
                )
            )
            .where(db_models.SportsGame.game_date >= day_start)
            .where(db_models.SportsGame.game_date <= day_end)
        )
        name_match_id = session.execute(swapped_name_match_stmt).scalar()
    
    if name_match_id is not None:
        logger.info(
            "odds_game_matched_by_name",
            league=snapshot.league_code,
            home_team_name=snapshot.home_team.name,
            away_team_name=snapshot.away_team.name,
            matched_game_id=name_match_id,
            game_date=str(snapshot.game_date.date()),
        )
    
    return name_match_id


def upsert_odds(session: Session, snapshot: NormalizedOddsSnapshot) -> bool:
    """Upsert odds snapshot, matching to existing game.
    
    Tries multiple matching strategies:
    1. Match by team IDs (exact and swapped)
    2. Match by team names (NCAAB uses normalized matching, others use exact)
    
    Returns False if no matching game is found, True if odds were persisted.
    """
    league_id = get_league_id(session, snapshot.league_code)
    
    home_team_id = _find_team_by_name(session, league_id, snapshot.home_team.name, snapshot.home_team.abbreviation)
    if home_team_id is None:
        logger.debug(
            "odds_team_not_found_creating",
            team_name=snapshot.home_team.name,
            abbreviation=snapshot.home_team.abbreviation,
            league=snapshot.league_code,
        )
        home_team_id = _upsert_team(session, league_id, snapshot.home_team)
    else:
        if _should_log(f"odds_team_found:{home_team_id}", sample=200):
            logger.debug(
                "odds_team_found",
                team_name=snapshot.home_team.name,
                team_id=home_team_id,
                league=snapshot.league_code,
            )
    
    away_team_id = _find_team_by_name(session, league_id, snapshot.away_team.name, snapshot.away_team.abbreviation)
    if away_team_id is None:
        logger.debug(
            "odds_team_not_found_creating",
            team_name=snapshot.away_team.name,
            abbreviation=snapshot.away_team.abbreviation,
            league=snapshot.league_code,
        )
        away_team_id = _upsert_team(session, league_id, snapshot.away_team)
    else:
        if _should_log(f"odds_team_found:{away_team_id}", sample=200):
            logger.debug(
                "odds_team_found",
                team_name=snapshot.away_team.name,
                team_id=away_team_id,
                league=snapshot.league_code,
            )
    
    game_day = snapshot.game_date.date()
    cache_key = (
        snapshot.league_code,
        game_day,
        min(home_team_id, away_team_id),
        max(home_team_id, away_team_id),
    )
    cached = _cache_get(cache_key)
    if cached is not False:
        game_id = cached  # type: ignore[assignment]
        if game_id is None:
            return False
        # Skip noisy diagnostics when cached; proceed to insert/update odds.
        side_value = snapshot.side if snapshot.side else None
        stmt = (
            insert(db_models.SportsGameOdds)
            .values(
                game_id=game_id,
                book=snapshot.book,
                market_type=snapshot.market_type,
                side=side_value,
                line=snapshot.line,
                price=snapshot.price,
                is_closing_line=snapshot.is_closing_line,
                observed_at=snapshot.observed_at,
                source_key=snapshot.source_key,
                raw_payload=snapshot.raw_payload,
            )
            .on_conflict_do_update(
                index_elements=["game_id", "book", "market_type", "side", "is_closing_line"],
                set_={
                    "line": snapshot.line,
                    "price": snapshot.price,
                    "observed_at": snapshot.observed_at,
                    "source_key": snapshot.source_key,
                    "raw_payload": snapshot.raw_payload,
                    "updated_at": utcnow(),
                },
            )
        )
        session.execute(stmt)
        return True
    day_start = datetime.combine(game_day - timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
    day_end = datetime.combine(game_day + timedelta(days=1), datetime.max.time(), tzinfo=timezone.utc)
    
    if _should_log("odds_matching_start"):
        logger.debug(
            "odds_matching_start",
            league=snapshot.league_code,
            home_team_name=snapshot.home_team.name,
            home_team_id=home_team_id,
            away_team_name=snapshot.away_team.name,
            away_team_id=away_team_id,
            game_date=str(game_day),
            game_datetime=str(snapshot.game_date),
            day_start=str(day_start),
            day_end=str(day_end),
        )
    
    home_canonical, _ = normalize_team_name(snapshot.league_code, snapshot.home_team.name)
    away_canonical, _ = normalize_team_name(snapshot.league_code, snapshot.away_team.name)
    
    all_games_check = (
        select(
            db_models.SportsGame.id,
            db_models.SportsGame.game_date,
            db_models.SportsGame.home_team_id,
            db_models.SportsGame.away_team_id,
        )
        .where(db_models.SportsGame.league_id == league_id)
        .where(db_models.SportsGame.game_date >= day_start)
        .where(db_models.SportsGame.game_date <= day_end)
        .limit(10)
    )
    all_games = session.execute(all_games_check).all()
    
    diagnostic_games = []
    if all_games:
        team_ids = set()
        for g in all_games:
            team_ids.add(g[2])
            team_ids.add(g[3])
        
        teams_stmt = select(db_models.SportsTeam.id, db_models.SportsTeam.name).where(
            db_models.SportsTeam.id.in_(team_ids)
        )
        teams_map = {row[0]: row[1] for row in session.execute(teams_stmt).all()}
        
        diagnostic_games = [
            {
                "id": g[0],
                "date": str(g[1]),
                "home_id": g[2],
                "away_id": g[3],
                "home_name": teams_map.get(g[2], "unknown"),
                "away_name": teams_map.get(g[3], "unknown"),
            }
            for g in all_games
        ]
    
    if _should_log("odds_diagnostic_all_games"):
        logger.debug(
            "odds_diagnostic_all_games",
            league=snapshot.league_code,
            game_date=str(game_day),
            day_start=str(day_start),
            day_end=str(day_end),
            total_games_count=len(all_games),
            diagnostic_games=diagnostic_games[:3],  # trim noisy payload
            searching_for_home=snapshot.home_team.name,
            searching_for_away=snapshot.away_team.name,
        )
    
    home_team_alias = alias(db_models.SportsTeam)
    away_team_alias = alias(db_models.SportsTeam)
    
    games_check = (
        select(
            db_models.SportsGame.id,
            db_models.SportsGame.game_date,
            db_models.SportsGame.home_team_id,
            db_models.SportsGame.away_team_id,
        )
        .join(home_team_alias, db_models.SportsGame.home_team_id == home_team_alias.c.id)
        .join(away_team_alias, db_models.SportsGame.away_team_id == away_team_alias.c.id)
        .where(db_models.SportsGame.league_id == league_id)
        .where(db_models.SportsGame.game_date >= day_start)
        .where(db_models.SportsGame.game_date <= day_end)
        .where(
            or_(
                db_models.SportsGame.home_team_id == home_team_id,
                db_models.SportsGame.away_team_id == home_team_id,
                db_models.SportsGame.home_team_id == away_team_id,
                db_models.SportsGame.away_team_id == away_team_id,
                func.lower(home_team_alias.c.name) == func.lower(snapshot.home_team.name),
                func.lower(home_team_alias.c.name) == func.lower(home_canonical),
                func.lower(away_team_alias.c.name) == func.lower(snapshot.away_team.name),
                func.lower(away_team_alias.c.name) == func.lower(away_canonical),
                func.lower(home_team_alias.c.name) == func.lower(snapshot.away_team.name),
                func.lower(home_team_alias.c.name) == func.lower(away_canonical),
                func.lower(away_team_alias.c.name) == func.lower(snapshot.home_team.name),
                func.lower(away_team_alias.c.name) == func.lower(home_canonical),
            )
        )
        .limit(20)
    )
    potential_games = session.execute(games_check).all()
    
    if _should_log("odds_potential_games_found"):
        logger.debug(
            "odds_potential_games_found",
            league=snapshot.league_code,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
            potential_games_count=len(potential_games),
            potential_games=[
                {
                    "id": g[0],
                    "date": str(g[1]),
                    "home_id": g[2],
                    "away_id": g[3],
                }
                for g in potential_games[:5]
            ],
        )
    
    game_id = _match_game_by_team_ids(session, league_id, home_team_id, away_team_id, day_start, day_end)
    
    logger.debug(
        "odds_exact_match_attempt",
        league=snapshot.league_code,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
        game_id=game_id,
        matched=game_id is not None,
    )
    
    if game_id is None:
        if snapshot.league_code == "NCAAB":
            game_id = _match_game_by_names_ncaab(
                session, league_id, snapshot, home_canonical, away_canonical, day_start, day_end
            )
        else:
            game_id = _match_game_by_names_non_ncaab(
                session, league_id, snapshot, home_canonical, away_canonical, day_start, day_end
            )

    if game_id is None:
        home_team = session.execute(
            select(db_models.SportsTeam.name, db_models.SportsTeam.abbreviation)
            .where(db_models.SportsTeam.id == home_team_id)
        ).first()
        away_team = session.execute(
            select(db_models.SportsTeam.name, db_models.SportsTeam.abbreviation)
            .where(db_models.SportsTeam.id == away_team_id)
        ).first()
        
        if _should_log("odds_game_missing"):
            logger.warning(
                "odds_game_missing",
                league=snapshot.league_code,
                home_team_name=snapshot.home_team.name,
                home_team_abbr=snapshot.home_team.abbreviation,
                home_team_id=home_team_id,
                home_team_db_name=home_team[0] if home_team else None,
                home_team_db_abbr=home_team[1] if home_team else None,
                away_team_name=snapshot.away_team.name,
                away_team_abbr=snapshot.away_team.abbreviation,
                away_team_id=away_team_id,
                away_team_db_name=away_team[0] if away_team else None,
                away_team_db_abbr=away_team[1] if away_team else None,
                game_date=str(snapshot.game_date.date()),
                game_datetime=str(snapshot.game_date),
                day_start=str(day_start),
                day_end=str(day_end),
                potential_games_count=len(potential_games),
                potential_games=[{"id": g[0], "date": str(g[1]), "home_id": g[2], "away_id": g[3]} for g in potential_games[:3]],
            )
        _cache_set(cache_key, None)
        return False

    side_value = snapshot.side if snapshot.side else None

    stmt = (
        insert(db_models.SportsGameOdds)
        .values(
            game_id=game_id,
            book=snapshot.book,
            market_type=snapshot.market_type,
            side=side_value,
            line=snapshot.line,
            price=snapshot.price,
            is_closing_line=snapshot.is_closing_line,
            observed_at=snapshot.observed_at,
            source_key=snapshot.source_key,
            raw_payload=snapshot.raw_payload,
        )
        .on_conflict_do_update(
            index_elements=["game_id", "book", "market_type", "side", "is_closing_line"],
            set_={
                "line": snapshot.line,
                "price": snapshot.price,
                "observed_at": snapshot.observed_at,
                "source_key": snapshot.source_key,
                "raw_payload": snapshot.raw_payload,
                "updated_at": utcnow(),
            },
        )
    )
    session.execute(stmt)
    _cache_set(cache_key, game_id)
    return True
