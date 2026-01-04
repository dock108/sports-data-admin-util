"""Integration test for the compact moments endpoint."""

from __future__ import annotations

import os
import sys
import unittest
from types import SimpleNamespace
from typing import AsyncGenerator

TESTS_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(TESTS_DIR, "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient

from app.db import get_db
from app.routers import sports as sports_router
from api.main import app


class _FakeResult:
    def __init__(self, plays: list[SimpleNamespace]) -> None:
        self._plays = plays

    def scalars(self) -> "_FakeResult":
        return self

    def all(self) -> list[SimpleNamespace]:
        return self._plays


class _FakeSession:
    def __init__(self, game: object, plays: list[SimpleNamespace]) -> None:
        self._game = game
        self._plays = plays
        self.execute_calls = 0
        self.get_calls = 0

    async def get(self, model: object, game_id: int) -> object | None:
        self.get_calls += 1
        if game_id == 123:
            return self._game
        return None

    async def execute(self, statement: object) -> _FakeResult:
        self.execute_calls += 1
        return _FakeResult(self._plays)


class TestCompactMomentsEndpoint(unittest.TestCase):
    def setUp(self) -> None:
        self.plays = [
            SimpleNamespace(
                play_index=1,
                quarter=1,
                game_clock="12:00",
                play_type="shot",
                player_name="Jane Doe",
                raw_data={"team_abbreviation": "BOS"},
                home_score=None,
                away_score=None,
            ),
            SimpleNamespace(
                play_index=2,
                quarter=1,
                game_clock="11:45",
                play_type=None,
                player_name=None,
                raw_data={},
                home_score=None,
                away_score=None,
            ),
        ]
        self.session = _FakeSession(game=object(), plays=self.plays)

        async def override_get_db() -> AsyncGenerator[_FakeSession, None]:
            yield self.session

        app.dependency_overrides[get_db] = override_get_db
        sports_router._compact_cache.clear()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        sports_router._compact_cache.clear()

    def test_compact_moments_cached_response(self) -> None:
        response = self.client.get("/api/admin/sports/games/123/compact")
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["momentTypes"], ["shot", "unknown"])
        self.assertEqual(len(payload["moments"]), 2)
        self.assertEqual(payload["moments"][0]["playIndex"], 1)
        self.assertEqual(payload["moments"][0]["hint"], "BOS - Jane Doe")
        self.assertNotIn("homeScore", payload["moments"][0])
        self.assertNotIn("awayScore", payload["moments"][0])
        self.assertEqual(payload["scoreChips"], [])

        cached_response = self.client.get("/api/admin/sports/games/123/compact")
        self.assertEqual(cached_response.status_code, 200)
        self.assertEqual(self.session.execute_calls, 1)
        self.assertEqual(self.session.get_calls, 1)

    def test_compact_moments_score_chips_boundary_only(self) -> None:
        plays = [
            SimpleNamespace(
                play_index=1,
                quarter=1,
                game_clock="12:00",
                play_type="tip",
                player_name=None,
                raw_data={},
                home_score=0,
                away_score=0,
            ),
            SimpleNamespace(
                play_index=2,
                quarter=1,
                game_clock="0:00",
                play_type="end",
                player_name=None,
                raw_data={},
                home_score=22,
                away_score=20,
            ),
            SimpleNamespace(
                play_index=3,
                quarter=2,
                game_clock="12:00",
                play_type="start",
                player_name=None,
                raw_data={},
                home_score=22,
                away_score=20,
            ),
            SimpleNamespace(
                play_index=4,
                quarter=2,
                game_clock="0:00",
                play_type="end",
                player_name=None,
                raw_data={},
                home_score=45,
                away_score=40,
            ),
            SimpleNamespace(
                play_index=5,
                quarter=3,
                game_clock="0:00",
                play_type="end",
                player_name=None,
                raw_data={},
                home_score=65,
                away_score=60,
            ),
            SimpleNamespace(
                play_index=6,
                quarter=4,
                game_clock="10:00",
                play_type="shot",
                player_name=None,
                raw_data={},
                home_score=80,
                away_score=75,
            ),
        ]
        session = _FakeSession(game=object(), plays=plays)

        async def override_get_db() -> AsyncGenerator[_FakeSession, None]:
            yield session

        app.dependency_overrides[get_db] = override_get_db
        sports_router._compact_cache.clear()
        client = TestClient(app)

        response = client.get("/api/admin/sports/games/123/compact")
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(
            [chip["label"] for chip in payload["scoreChips"]],
            ["End Q1", "Halftime", "End Q3", "Current score"],
        )
        self.assertEqual(payload["scoreChips"][0]["playIndex"], 2)
        self.assertEqual(payload["scoreChips"][0]["homeScore"], 22)
        self.assertEqual(payload["scoreChips"][0]["awayScore"], 20)
