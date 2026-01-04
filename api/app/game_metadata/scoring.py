"""Scoring helpers for game metadata."""

from __future__ import annotations

import logging

from .models import GameContext, StandingsEntry, TeamRatings

logger = logging.getLogger(__name__)

ELO_MIN = 1200.0
ELO_MAX = 2000.0
KENPOM_EFF_MIN = -10.0
KENPOM_EFF_MAX = 40.0
PROJECTED_SEED_MIN = 1
PROJECTED_SEED_MAX = 16
CONFERENCE_RANK_MAX = 16
TOTAL_WEIGHT = 3.0

NOT_IMPLEMENTED_MESSAGE = "Game metadata scoring is not implemented yet."


def _normalize(value: float, minimum: float, maximum: float) -> float:
    """Normalize a value to a 0-1 range with clamping."""
    if maximum <= minimum:
        raise ValueError("maximum must be greater than minimum")
    normalized = (value - minimum) / (maximum - minimum)
    return max(0.0, min(1.0, normalized))


def _normalize_seed(projected_seed: int | None) -> float:
    """Normalize projected seed so lower seeds rank higher."""
    if projected_seed is None:
        return 0.0
    clamped_seed = max(PROJECTED_SEED_MIN, min(PROJECTED_SEED_MAX, projected_seed))
    return _normalize(
        PROJECTED_SEED_MAX - clamped_seed + PROJECTED_SEED_MIN,
        PROJECTED_SEED_MIN,
        PROJECTED_SEED_MAX,
    )


def _normalize_conference_rank(conference_rank: int) -> float:
    """Normalize conference rank so top ranks score higher."""
    clamped_rank = max(1, min(CONFERENCE_RANK_MAX, conference_rank))
    return _normalize(CONFERENCE_RANK_MAX - clamped_rank + 1, 1, CONFERENCE_RANK_MAX)


def _normalize_elo(elo: float) -> float:
    """Normalize elo to a 0-1 range based on expected bounds."""
    return _normalize(elo, ELO_MIN, ELO_MAX)


def _normalize_efficiency(kenpom_adj_eff: float) -> float:
    """Normalize efficiency to a 0-1 range based on expected bounds."""
    return _normalize(kenpom_adj_eff, KENPOM_EFF_MIN, KENPOM_EFF_MAX)


def _team_strength(rating: TeamRatings) -> float:
    """Return normalized team strength from Elo and efficiency."""
    normalized_elo = _normalize_elo(rating.elo)
    if rating.kenpom_adj_eff is None:
        return normalized_elo
    normalized_eff = _normalize_efficiency(rating.kenpom_adj_eff)
    return (normalized_elo + normalized_eff) / 2


def quality_score(
    home_rating: TeamRatings,
    away_rating: TeamRatings,
    home_standing: StandingsEntry,
    away_standing: StandingsEntry,
) -> float:
    """Calculate a normalized quality score for a matchup.

    Args:
        home_rating: Ratings for the home team.
        away_rating: Ratings for the away team.
        home_standing: Conference standings for the home team.
        away_standing: Conference standings for the away team.

    Returns:
        A quality score normalized to a 0-100 range.
    """
    matchup_strength = (_team_strength(home_rating) + _team_strength(away_rating)) / 2

    postseason_weight = (
        _normalize_seed(home_rating.projected_seed)
        + _normalize_seed(away_rating.projected_seed)
    ) / 2

    top_of_conference_weight = (
        _normalize_conference_rank(home_standing.conference_rank)
        + _normalize_conference_rank(away_standing.conference_rank)
    ) / 2

    raw_score = matchup_strength + postseason_weight + top_of_conference_weight
    normalized_score = _normalize(raw_score, 0.0, TOTAL_WEIGHT) * 100

    logger.debug(
        "Computed quality score",
        extra={
            "home_team": home_rating.team_id,
            "away_team": away_rating.team_id,
            "matchup_strength": matchup_strength,
            "postseason_weight": postseason_weight,
            "top_of_conference_weight": top_of_conference_weight,
            "raw_score": raw_score,
            "normalized_score": normalized_score,
        },
    )

    return normalized_score


def score_game_context(context: GameContext) -> float:
    """Score a game context for metadata ordering.

    Raises:
        NotImplementedError: Until scoring rules are defined.
    """
    logger.error(NOT_IMPLEMENTED_MESSAGE, extra={"game_id": context.game_id})
    raise NotImplementedError(NOT_IMPLEMENTED_MESSAGE)
