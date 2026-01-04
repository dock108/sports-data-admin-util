"""Tests for game metadata scoring."""

from __future__ import annotations

import unittest

from api.app.game_metadata.models import StandingsEntry, TeamRatings
from api.app.game_metadata.scoring import quality_score


class TestGameMetadataScoring(unittest.TestCase):
    def test_quality_score_returns_normalized_value(self) -> None:
        home_rating = TeamRatings(
            team_id="team-001",
            conference="Atlantic",
            elo=1675.4,
            kenpom_adj_eff=23.1,
            projected_seed=2,
        )
        away_rating = TeamRatings(
            team_id="team-002",
            conference="Atlantic",
            elo=1612.8,
            kenpom_adj_eff=None,
            projected_seed=None,
        )
        home_standing = StandingsEntry(
            team_id="team-001",
            conference_rank=1,
            wins=24,
            losses=4,
        )
        away_standing = StandingsEntry(
            team_id="team-002",
            conference_rank=2,
            wins=22,
            losses=6,
        )

        score = quality_score(home_rating, away_rating, home_standing, away_standing)

        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 100.0)
        self.assertAlmostEqual(score, 66.8465, places=3)


if __name__ == "__main__":
    unittest.main()
